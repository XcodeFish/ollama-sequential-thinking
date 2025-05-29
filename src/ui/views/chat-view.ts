import * as vscode from 'vscode';
import { OllamaClient } from '../../api/client';
import { log } from '../../utils/logger';
import { WebviewUtils } from '../webview';

/**
 * Ollama聊天视图提供者
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ollama-sequential-thinking.chatView';

  private _view?: vscode.WebviewView;
  private _client: OllamaClient;
  private _messages: Array<{role: string, content: string}> = [];
  private _isFirstLoad = true; // 标记是否首次加载

  /**
   * 构造函数
   * @param extensionUri 扩展URI
   * @param client OllamaClient实例
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    client: OllamaClient
  ) {
    this._client = client;
  }

  /**
   * 解析WebviewView
   * @param webviewView WebviewView
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: vscode.WebviewViewResolveContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): void {
    try {
      log('🎉 ChatViewProvider.resolveWebviewView 被调用！', 'info');
      console.log('🎉 ChatViewProvider.resolveWebviewView 被调用！');
      console.log('WebviewView对象:', webviewView);
      console.log('视图ID:', webviewView.viewType);
      this._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      };

      // 使用新创建的chat-view.html
      console.log('开始调用WebviewUtils.getWebviewContent');
      console.log('extensionUri:', this._extensionUri.fsPath);
      console.log('模板路径: resources/webviews/chat-view.html');

      webviewView.webview.html = WebviewUtils.getWebviewContent(
        this._extensionUri,
        webviewView.webview,
        'resources/webviews/chat-view.html' // 使用新的模板路径
      );

      console.log('WebviewUtils.getWebviewContent 调用完成');

      log('聊天视图HTML内容已加载', 'info');

      // 处理来自WebView的消息
      webviewView.webview.onDidReceiveMessage(async (data) => {
        log(`收到聊天视图消息: ${JSON.stringify(data)}`, 'info');
        switch (data.command) {
          case 'sendMessage':
            await this._handleUserMessage(data.message);
          break;
          case 'webviewLoaded': {
            // 视图加载完成后设置初始状态
            webviewView.webview.postMessage({
              command: 'updateModel',
              model: this._client.getDefaultModel()
            });
            
            // 检查连接状态
            const isConnected = await this._client.ping();
            webviewView.webview.postMessage({
              command: 'updateConnectionStatus',
              isConnected: isConnected
            });

            // 如果是第一次加载，自动显示欢迎消息
            if (this._isFirstLoad) {
              this._isFirstLoad = false;
              // 添加系统欢迎消息
              webviewView.webview.postMessage({
                command: 'addSystemMessage',
                content: '欢迎使用Ollama助手，请输入您的问题'
              });
            }
            break;
          }
          case 'openOptions':
            vscode.commands.executeCommand('ollama-sequential-thinking.configureModelParams');
          break;
      }
    });

      log('聊天视图初始化完成', 'info');
    } catch (error) {
      log(`聊天视图加载失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
      // 在出错时显示一个基本界面
      if (webviewView && webviewView.webview) {
        webviewView.webview.html = `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>错误</title>
          <style>
            body { padding: 20px; font-family: sans-serif; }
            .error { color: red; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h2>加载失败</h2>
          <div class="error">聊天视图加载失败，请重启编辑器并确认Ollama服务正在运行。</div>
        </body>
        </html>`;
      }
    }
  }

  /**
   * 处理用户消息
   * @param message 用户消息
   */
  private async _handleUserMessage(message: string): Promise<void> {
    if (!message || message.trim() === '') {
      return;
    }

    // 添加用户消息到WebView
    this._view?.webview.postMessage({
      command: 'addMessage',
      content: message, // 直接传递原始消息，前端会处理格式化
      isUser: true
    });

    // 存储用户消息
    this._messages.push({ role: 'user', content: message });

    try {
      // 获取配置
      const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
      const useStreamingOutput = true; // 强制启用流式输出
      
      // 获取默认模型
      const model = this._client.getDefaultModel();

      if (useStreamingOutput) {
        // 创建助手消息占位
        this._view?.webview.postMessage({
          command: 'addMessage',
          content: '',
          isUser: false
        });
        
        // 调用Ollama API获取流式响应
        try {
          // 确定API端点
          const apiEndpoint = config.get<string>('apiEndpoint') || 'http://localhost:11434';
          
          // 发送API请求
          const response = await fetch(`${apiEndpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: `你是一个AI助手，专注于提供简洁、清晰的回答，不需要展示思考过程。
回答编程问题时，直接给出代码示例和解释。
如果是关于前端开发或React/JSX的问题，请确保提供完整、正确的代码示例，使用Markdown格式的代码块(\`\`\`)并明确指定语言(例如javascript, jsx, typescript等)。
代码示例应该是实用的、可直接使用的，并附有简短说明。
避免显示草稿或思考过程。

用户问题: ${message}
回复:`,
              stream: true,
              options: {
                temperature: config.get<number>('temperature') || 0.7,
                max_tokens: config.get<number>('maxTokens') || 2048,
                top_p: config.get<number>('topP') || 0.9,
                top_k: config.get<number>('topK') || 40
              }
            })
          });
          
          if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('无法获取响应流');
          }
          
          let fullResponse = '';
          
          // 处理流式响应
          let isReading = true;
          while (isReading) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                isReading = false;
                break;
              }
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  if (data.done) {
                    continue;
                  }
                  
                  if (data.response) {
                    fullResponse += data.response;
                    
                    // 直接将原始文本发送到前端，由前端处理Markdown和代码高亮
                    this._view?.webview.postMessage({
                      command: 'streamResponse',
                      chunk: data.response
                    });
                  }
                  
                } catch (e) {
                  // 忽略JSON解析错误
                  if (e instanceof SyntaxError) {
                    log(`JSON解析错误: ${e.message}`, 'warning');
                  } else {
                    throw e;
                  }
                }
              }
            } catch (error) {
              log(`读取流数据错误: ${error}`, 'error');
              break;
            }
          }
          
          // 更新消息内容
          this._messages.push({ role: 'assistant', content: fullResponse });
          
          // 流式响应结束
          this._view?.webview.postMessage({
            command: 'endStream'
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log(`流式聊天请求失败: ${errorMessage}`, 'error');
          
          // 显示错误消息
          this._view?.webview.postMessage({
            command: 'addMessage',
            content: `错误: ${errorMessage}`,
            isError: true
          });
          
          // 存储错误消息
          this._messages.push({ role: 'system', content: `错误: ${errorMessage}` });
        }
      } else {
        // 调用Ollama API获取响应
        const response = await this._client.generate({
          prompt: message,
          model: model,
          stream: false
        });

        // 直接发送原始响应，由前端处理Markdown和代码高亮
        this._view?.webview.postMessage({
          command: 'addMessage',
          content: response,
          isUser: false
        });
        
        // 存储响应消息
        this._messages.push({ role: 'assistant', content: response });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`聊天请求失败: ${errorMessage}`, 'error');

      // 显示错误消息
      this._view?.webview.postMessage({
        command: 'addMessage',
        content: `错误: ${errorMessage}`,
        isError: true
      });
      
      // 存储错误消息
      this._messages.push({ role: 'system', content: `错误: ${errorMessage}` });
    }
  }
}

/**
 * 注册聊天视图
 * @param context 扩展上下文
 * @param client Ollama客户端
 */
export function registerChatView(context: vscode.ExtensionContext, client: OllamaClient): void {
  try {
    // 注册WebView视图提供者
    const provider = new ChatViewProvider(context.extensionUri, client);
    console.log('🔧 正在注册聊天视图提供者');
    console.log('   - viewType:', ChatViewProvider.viewType);
    console.log('   - extensionUri:', context.extensionUri.fsPath);
    console.log('   - provider实例:', provider);

    const disposable = vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        }
      }
    );

    console.log('   - 注册结果disposable:', disposable);
    context.subscriptions.push(disposable);

    log('✅ 聊天视图已注册', 'info');
    console.log('✅ 聊天视图注册完成');

    // 验证注册是否成功
    setTimeout(() => {
      console.log('🔍 验证视图注册状态...');
      console.log('   - subscriptions数量:', context.subscriptions.length);
    }, 100);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ 聊天视图注册失败: ${errorMessage}`, 'error');
    console.error('❌ 聊天视图注册失败:', error);
    throw error;
  }
}