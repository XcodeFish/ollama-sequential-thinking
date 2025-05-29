import * as vscode from 'vscode';
import { ThinkingResult, ThinkingStep } from '../../core/engine';
import { log } from '../../utils/logger';

/**
 * 结果展示面板
 * 用于显示思考结果
 */
export class ResultPanel {
  public static currentPanel: ResultPanel | undefined;
  
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private result?: ThinkingResult;
  private disposables: vscode.Disposable[] = [];
  private isStreaming: boolean = false;

  /**
   * 创建或显示结果面板
   * @param extensionUri 扩展URI
   * @param result 思考结果
   */
  public static createOrShow(extensionUri: vscode.Uri, result?: ThinkingResult): ResultPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已经有面板，直接展示
    if (ResultPanel.currentPanel) {
      ResultPanel.currentPanel.panel.reveal(column);
      if (result) {
        ResultPanel.currentPanel.update(result);
      }
      return ResultPanel.currentPanel;
    }

    // 否则创建新面板
    const panel = vscode.window.createWebviewPanel(
      'ollamaSequentialThinking',
      'Ollama思考结果',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    ResultPanel.currentPanel = new ResultPanel(panel, extensionUri);
    if (result) {
      ResultPanel.currentPanel.update(result);
    }
    
    return ResultPanel.currentPanel;
  }

  /**
   * 私有构造函数
   * @param panel WebView面板
   * @param extensionUri 扩展URI
   */
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    // 设置初始HTML内容
    this.updateWebview();

    // 处理面板关闭事件
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // 处理面板消息
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'copyCode':
            this.copyToClipboard(message.code);
            break;
          case 'insertCode':
            this.insertToEditor(message.code);
            break;
        }
      },
      null,
      this.disposables
    );
    
    log('结果展示面板已创建', 'info');
  }

  /**
   * 更新面板内容
   * @param result 思考结果
   */
  public update(result: ThinkingResult): void {
    this.result = result;
    this.isStreaming = false;
    this.panel.title = `思考: ${result.question.substring(0, 30)}${result.question.length > 30 ? '...' : ''}`;
    this.updateWebview();
    log('更新结果展示面板', 'info');
  }

  /**
   * 开始流式响应模式
   * @param initialResult 初始思考结果
   */
  public startStreaming(initialResult: ThinkingResult): void {
    this.result = initialResult;
    this.isStreaming = true;
    this.panel.title = `思考: ${initialResult.question.substring(0, 30)}${initialResult.question.length > 30 ? '...' : ''}`;
    this.updateWebview();
    
    // 向webview发送流式开始消息
    this.panel.webview.postMessage({ 
      command: 'startStreaming', 
      stepIndex: this.result.steps.length - 1 
    });
    
    log('开始流式响应', 'info');
  }

  /**
   * 向当前步骤添加流式内容
   * @param content 要添加的内容
   * @param stepIndex 步骤索引，默认为最后一个步骤
   */
  public appendToResult(content: string, stepIndex?: number): void {
    if (!this.result || !this.isStreaming) {
      return;
    }

    const targetIndex = stepIndex !== undefined ? stepIndex : this.result.steps.length - 1;
    
    if (targetIndex >= 0 && targetIndex < this.result.steps.length) {
      // 向webview发送内容更新消息
      this.panel.webview.postMessage({ 
        command: 'appendContent', 
        content, 
        stepIndex: targetIndex 
      });
      
      // 更新本地结果对象
      this.result.steps[targetIndex].content += content;
      
      // 如果是最后一步，同时更新result字段
      if (targetIndex === this.result.steps.length - 1) {
        this.result.result += content;
      }
    }
  }

  /**
   * 添加新的思考步骤
   * @param step 思考步骤
   */
  public addThinkingStep(step: ThinkingStep): void {
    if (!this.result) {
      return;
    }
    
    this.result.steps.push(step);
    
    // 向webview发送添加步骤消息
    this.panel.webview.postMessage({ 
      command: 'addStep', 
      step,
      stepIndex: this.result.steps.length - 1
    });
    
    log(`添加思考步骤: ${step.title}`, 'info');
  }

  /**
   * 结束流式响应
   * @param finalResult 最终结果，如果不提供则使用当前累积的结果
   */
  public endStreaming(finalResult?: string): void {
    if (!this.result || !this.isStreaming) {
      return;
    }
    
    this.isStreaming = false;
    
    if (finalResult) {
      this.result.result = finalResult;
    }
    
    // 向webview发送流式结束消息
    this.panel.webview.postMessage({ command: 'endStreaming' });
    
    log('结束流式响应', 'info');
  }

  /**
   * 更新WebView内容
   */
  private updateWebview(): void {
    this.panel.webview.html = this.getHtml();
  }

  /**
   * 复制内容到剪贴板
   * @param text 要复制的文本
   */
  private async copyToClipboard(text: string): Promise<void> {
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('代码已复制到剪贴板');
  }

  /**
   * 将代码插入编辑器
   * @param code 要插入的代码
   */
  private async insertToEditor(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('没有活动的编辑器');
      return;
    }

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, code);
    });
    
    vscode.window.showInformationMessage('代码已插入编辑器');
  }

  /**
   * 生成HTML
   * @returns HTML内容
   */
  private getHtml(): string {
    const webview = this.panel.webview;

    const styles = `
      :root {
        --container-padding: 20px;
        --input-padding-vertical: 6px;
        --input-padding-horizontal: 4px;
        --input-margin-vertical: 4px;
        --input-margin-horizontal: 0;
      }
      
      body {
        padding: 0 var(--container-padding);
        color: var(--vscode-foreground);
        font-size: var(--vscode-font-size);
        font-weight: var(--vscode-font-weight);
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
      }

      ol {
        padding-left: 0;
      }
      
      .step-container {
        margin-bottom: 1.5em;
        border-left: 3px solid var(--vscode-activityBarBadge-background);
        padding-left: 1em;
      }
      
      .step-title {
        font-weight: bold;
        margin-bottom: 0.5em;
        color: var(--vscode-activityBarBadge-background);
      }
      
      .step-content {
        margin-top: 0.5em;
        white-space: pre-wrap;
      }
      
      .code-block {
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        padding: 1em;
        margin: 1em 0;
        border-radius: 4px;
        overflow-x: auto;
        position: relative;
      }
      
      .code-block-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 0.5em;
      }
      
      .code-action-button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 8px;
        margin-left: 8px;
        border-radius: 2px;
        cursor: pointer;
      }
      
      .code-action-button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      
      .result-header {
        margin-bottom: 2em;
        padding-bottom: 0.5em;
        border-bottom: 1px solid var(--vscode-activityBarBadge-background);
      }
      
      .result-footer {
        margin-top: 2em;
        padding-top: 0.5em;
        border-top: 1px solid var(--vscode-activityBarBadge-background);
        font-size: 0.9em;
        color: var(--vscode-descriptionForeground);
      }
      
      .message {
        margin: 2em 0;
        padding: 1em;
        text-align: center;
        font-style: italic;
      }
      
      .cursor {
        display: inline-block;
        width: 0.5em;
        height: 1em;
        background-color: var(--vscode-editorCursor-foreground);
        animation: blink 1s step-end infinite;
        vertical-align: text-bottom;
        margin-left: 2px;
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `;

    // 生成nonce
    const nonce = this.getNonce();

    let content = '';
    
    if (!this.result) {
      content = `<div class="message">等待思考结果...</div>`;
    } else {
      const { result, question, steps, processTime, model } = this.result;

      const stepsHtml = steps.map((step, index) => this.renderStep(step, index)).join('\n');
      const resultHtml = this.renderResult(result);

      content = `
        <div class="result-header">
          <h2>问题: ${this.escapeHtml(question)}</h2>
        </div>
        
        <h3>思考步骤:</h3>
        <ol id="steps-container">
          ${stepsHtml}
        </ol>
        
        <h3>最终结果:</h3>
        <div id="final-result">
          ${resultHtml}
        </div>
        
        <div class="result-footer">
          <p>处理时间: <span id="process-time">${processTime}</span>ms | 使用模型: ${model}</p>
        </div>
      `;
    }

    return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Ollama思考结果</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      ${content}
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function copyCode(codeElement) {
          const code = codeElement.querySelector('code').innerText;
          vscode.postMessage({
            command: 'copyCode',
            code: code
          });
        }
        
        function insertCode(codeElement) {
          const code = codeElement.querySelector('code').innerText;
          vscode.postMessage({
            command: 'insertCode',
            code: code
          });
        }
        
        // 格式化内容，处理代码块
        function formatContent(content) {
          // 处理代码块
          let formattedContent = content.replace(
            /\`\`\`([\\s\\S]*?)\`\`\`/g,
            (match, code) => {
              return \`
                <div class="code-block">
                  <div class="code-block-header">
                    <button class="code-action-button copy-button">复制</button>
                    <button class="code-action-button insert-button">插入</button>
                  </div>
                  <pre><code>\${escapeHtml(code)}</code></pre>
                </div>
              \`;
            }
          );

          // 处理换行
          formattedContent = formattedContent.replace(/\\n/g, '<br>');

          return formattedContent;
        }
        
        // HTML转义
        function escapeHtml(text) {
          return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch(message.command) {
            case 'startStreaming':
              // 添加光标到指定步骤
              const stepContent = document.querySelector(\`#step-content-\${message.stepIndex}\`);
              if (stepContent) {
                if (!stepContent.querySelector('.cursor')) {
                  stepContent.innerHTML += '<span class="cursor"></span>';
                }
              }
              break;
              
            case 'appendContent':
              // 向指定步骤添加内容
              const targetStepContent = document.querySelector(\`#step-content-\${message.stepIndex}\`);
              if (targetStepContent) {
                // 移除光标
                const cursor = targetStepContent.querySelector('.cursor');
                if (cursor) {
                  cursor.remove();
                }
                
                // 添加新内容
                const formattedContent = formatContent(message.content);
                targetStepContent.innerHTML += formattedContent;
                
                // 重新添加光标
                targetStepContent.innerHTML += '<span class="cursor"></span>';
                
                // 添加事件监听
                addCodeBlockListeners();
                
                // 如果是最后一步，同时更新结果部分
                if (message.stepIndex === document.querySelectorAll('.step-container').length - 1) {
                  const finalResult = document.getElementById('final-result');
                  if (finalResult) {
                    finalResult.innerHTML = formatContent(targetStepContent.textContent);
                    addCodeBlockListeners();
                  }
                }
              }
              break;
              
            case 'addStep':
              // 添加新的思考步骤
              const stepsContainer = document.getElementById('steps-container');
              if (stepsContainer) {
                const stepHtml = \`
                  <li class="step-container">
                    <div class="step-title">\${escapeHtml(message.step.title)}</div>
                    <div id="step-content-\${message.stepIndex}" class="step-content">
                      \${formatContent(message.step.content)}
                      <span class="cursor"></span>
                    </div>
                  </li>
                \`;
                stepsContainer.innerHTML += stepHtml;
                addCodeBlockListeners();
              }
              break;
              
            case 'endStreaming':
              // 移除所有光标
              document.querySelectorAll('.cursor').forEach(cursor => cursor.remove());
              
              // 更新处理时间
              const processTimeElement = document.getElementById('process-time');
              if (processTimeElement && message.processTime) {
                processTimeElement.textContent = message.processTime;
              }
              break;
          }
        });
        
        function addCodeBlockListeners() {
          // 添加代码块按钮事件监听
          document.querySelectorAll('.copy-button').forEach(button => {
            if (!button.hasListener) {
              button.addEventListener('click', () => {
                const codeBlock = button.closest('.code-block');
                copyCode(codeBlock);
              });
              button.hasListener = true;
            }
          });
          
          document.querySelectorAll('.insert-button').forEach(button => {
            if (!button.hasListener) {
              button.addEventListener('click', () => {
                const codeBlock = button.closest('.code-block');
                insertCode(codeBlock);
              });
              button.hasListener = true;
            }
          });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
          addCodeBlockListeners();
        });
      </script>
    </body>
    </html>`;
  }

  /**
   * 渲染思考步骤
   * @param step 思考步骤
   * @param index 步骤索引
   * @returns HTML内容
   */
  private renderStep(step: ThinkingStep, index: number): string {
    const titleHtml = this.escapeHtml(step.title);
    const contentHtml = this.formatContent(step.content);

    return `
      <li class="step-container">
        <div class="step-title">${titleHtml}</div>
        <div id="step-content-${index}" class="step-content">${contentHtml}</div>
      </li>
    `;
  }

  /**
   * 渲染最终结果
   * @param result 结果内容
   * @returns HTML内容
   */
  private renderResult(result: string): string {
    return this.formatContent(result);
  }

  /**
   * 格式化内容，处理代码块
   * @param content 内容
   * @returns 格式化后的HTML
   */
  private formatContent(content: string): string {
    // 处理代码块
    let formattedContent = content.replace(
      /```([\s\S]*?)```/g,
      (match, code) => {
        return `
          <div class="code-block">
            <div class="code-block-header">
              <button class="code-action-button copy-button">复制</button>
              <button class="code-action-button insert-button">插入</button>
            </div>
            <pre><code>${this.escapeHtml(code)}</code></pre>
          </div>
        `;
      }
    );

    // 处理换行
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    return formattedContent;
  }

  /**
   * HTML转义
   * @param text 文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 生成随机nonce
   * @returns nonce字符串
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    ResultPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log('结果展示面板已关闭', 'info');
  }
} 