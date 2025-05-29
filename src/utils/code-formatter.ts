/**
 * 代码格式化工具类
 * 提供代码高亮和语言识别功能
 */
export class CodeFormatter {
  /**
   * 检测代码语言
   * @param code 代码内容
   * @returns 识别出的语言标识符
   */
  public static detectLanguage(code: string): string {
    // 检查TypeScript特征
    if (/import\s+|export\s+|interface\s+|type\s+/.test(code)) {
      return 'typescript';
    }
    
    // 检查Python特征
    if (/def\s+|class\s+|import\s+|print\s*\(/.test(code)) {
      return 'python';
    }
    
    // 检查Java特征
    if (/public\s+class|private\s+|protected\s+|System\.out\.print/.test(code)) {
      return 'java';
    }
    
    // 检查HTML特征
    if (/<html|<div|<span|<head|<body/.test(code)) {
      return 'html';
    }
    
    // 检查CSS特征
    if (/\.\w+\s*\{|@media|@keyframes|:root/.test(code)) {
      return 'css';
    }
    
    // 检查JavaScript特征
    if (/function\s+|const\s+|let\s+|var\s+|=>/.test(code)) {
      return 'javascript';
    }
    
    // 检查其他语言...
    // 如果没有匹配项，返回纯文本
    return 'plaintext';
  }

  /**
   * 处理代码块
   * @param content Markdown内容
   * @returns 处理后的内容，代码块被替换为HTML格式
   */
  public static processCodeBlocks(content: string): string {
    const codeBlockRegex = /```(\w*)?[\n\r]([\s\S]*?)```/g;
    
    return content.replace(codeBlockRegex, (match, lang, code) => {
      const detectedLang = lang || this.detectLanguage(code);
      return this.wrapInCodeBlock(code, detectedLang);
    });
  }

  /**
   * 将代码包装在代码块HTML中
   * @param code 代码内容
   * @param lang 语言标识符
   * @returns HTML格式的代码块
   */
  public static wrapInCodeBlock(code: string, lang: string): string {
    // 替换HTML特殊字符
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 构建代码块HTML
    return `<div class="code-block-container">
      <div class="code-block-header">
        <span class="code-block-language">${lang}</span>
        <button class="code-block-copy-button" onclick="copyToClipboard(this)">复制</button>
      </div>
      <pre class="code-block language-${lang}"><code>${escapedCode}</code></pre>
    </div>`;
  }

  /**
   * 创建行内代码
   * @param code 代码内容
   * @returns HTML格式的行内代码
   */
  public static createInlineCode(code: string): string {
    return `<code class="inline-code">${code}</code>`;
  }

  /**
   * 获取代码块的CSS样式
   * @returns CSS样式字符串
   */
  public static getCodeBlockStyles(): string {
    return `
    /* 代码块基础样式 */
    .code-block-container {
      margin: 0.8em 0;
      border-radius: 4px;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
    }

    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background-color: var(--vscode-editorGroupHeader-tabsBackground);
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      font-family: var(--vscode-font-family);
    }

    .code-block-language {
      font-size: 0.8em;
      color: var(--vscode-editorHint-foreground);
      text-transform: lowercase;
    }

    .code-block-copy-button {
      background: none;
      border: none;
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      font-size: 0.8em;
      padding: 2px 6px;
      border-radius: 2px;
      cursor: pointer;
    }

    .code-block-copy-button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .code-block {
      margin: 0;
      padding: 1em;
      overflow-x: auto;
      tab-size: 2;
      font-family: 'Fira Code', Consolas, 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.4;
    }

    /* 行内代码样式 */
    .inline-code {
      padding: 0.2em 0.4em;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      font-family: 'Fira Code', Consolas, 'Courier New', monospace;
      font-size: 0.9em;
    }

    /* 深色主题适配 */
    .vscode-dark .code-block-container {
      --prism-background: #1e1e1e;
      --prism-color: #d4d4d4;
    }

    /* 浅色主题适配 */
    .vscode-light .code-block-container {
      --prism-background: #f3f3f3;
      --prism-color: #333;
    }
    `;
  }

  /**
   * 获取复制代码的JavaScript函数
   * @returns JavaScript函数代码
   */
  public static getCopyCodeScript(): string {
    return `
    function copyToClipboard(button) {
      const codeBlock = button.parentElement.nextElementSibling;
      const code = codeBlock.textContent;
      
      // 使用Clipboard API或创建一个临时文本区域
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code)
          .then(() => {
            const originalText = button.textContent;
            button.textContent = '已复制!';
            setTimeout(() => {
              button.textContent = originalText;
            }, 2000);
          })
          .catch(err => {
            console.error('无法复制代码: ', err);
          });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
          document.execCommand('copy');
          const originalText = button.textContent;
          button.textContent = '已复制!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        } catch (err) {
          console.error('无法复制代码: ', err);
        } finally {
          document.body.removeChild(textarea);
        }
      }
    }
    `;
  }
} 