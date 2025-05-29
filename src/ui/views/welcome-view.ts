import * as vscode from 'vscode';
import { WebviewUtils } from '../webview';
import { log } from '../../utils/logger';

/**
 * 欢迎视图提供者
 * 作为初始视图，确保侧边栏总有内容显示
 */
export class WelcomeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ollama-sequential-thinking.welcome';

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    try {
      // 设置WebView选项
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      };
      
      // 使用WebviewUtils加载HTML内容
      webviewView.webview.html = WebviewUtils.getWebviewContent(
        this.extensionUri,
        webviewView.webview,
        'resources/webview/welcome-view.html'
      );
      
      log('欢迎视图已加载', 'info');
      
      // 处理来自WebView的消息
      webviewView.webview.onDidReceiveMessage(message => {
        log(`收到欢迎视图消息: ${JSON.stringify(message)}`, 'info');
        
        if (message.command === 'openChat') {
          vscode.commands.executeCommand('ollama-sequential-thinking.openChatView');
        }
      });
    } catch (error) {
      log(`欢迎视图加载失败: ${error}`, 'error');
      // 在出错时提供基本的HTML内容
      webviewView.webview.html = `<!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>加载失败</title>
        <style>
          body { padding: 20px; font-family: sans-serif; color: #e74c3c; }
        </style>
      </head>
      <body>
        <h2>欢迎视图加载失败</h2>
        <p>请尝试重新加载窗口或者重新安装扩展。</p>
      </body>
      </html>`;
    }
  }
}

/**
 * 注册欢迎视图
 * @param context 扩展上下文
 */
export function registerWelcomeView(context: vscode.ExtensionContext): void {
  try {
    const provider = new WelcomeViewProvider(context.extensionUri);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        WelcomeViewProvider.viewType,
        provider
      )
    );
    
    log('欢迎视图已注册', 'info');
  } catch (error) {
    log(`注册欢迎视图失败: ${error}`, 'error');
  }
} 