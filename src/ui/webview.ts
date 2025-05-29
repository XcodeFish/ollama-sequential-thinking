import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../utils/logger';

/**
 * WebView工具类
 * 提供创建和管理WebView的通用方法
 */
export class WebviewUtils {
  /**
   * 获取WebView的HTML内容
   * @param extensionUri 扩展URI
   * @param webview WebView实例
   * @param templatePath HTML模板路径
   * @param fallbackHtml 备用HTML
   * @returns HTML内容
   */
  public static getWebviewContent(
    extensionUri: vscode.Uri,
    webview: vscode.Webview,
    templatePath: string,
    fallbackHtml?: string
  ): string {
    try {
      // 禁用调试模式，使用实际的HTML模板
      const debugMode = false;
      if (debugMode) {
        log(`使用调试模式加载WebView: ${templatePath}`, 'info');

        const nonce = this.generateNonce();

        // 使用一个非常简单的HTML以测试WebView是否正常工作
        const debugHtml = `
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <title>调试视图</title>
            <style>
              body {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: Arial, sans-serif;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              h1 { color: #ff6c00; }
              .debug-info {
                background-color: #2d2d2d;
                padding: 10px;
                border-radius: 5px;
                margin-top: 20px;
                width: 100%;
                max-width: 500px;
              }
              .test-button {
                background-color: #0078d7;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 2px;
                cursor: pointer;
                margin-top: 20px;
              }
              .test-button:hover {
                background-color: #005a9e;
              }
            </style>
          </head>
          <body>
            <h1>Ollama视图测试</h1>
            <div>这是一个测试视图，用于确认WebView是否正常工作</div>
            <button class="test-button" id="test-button">点击测试消息</button>
            <div class="debug-info">
              <p>路径: ${templatePath}</p>
              <p>时间: ${new Date().toLocaleString()}</p>
            </div>

            <script nonce="${nonce}">
              const vscode = acquireVsCodeApi();
              document.getElementById('test-button').addEventListener('click', () => {
                vscode.postMessage({
                  type: 'test',
                  message: '测试消息'
                });
              });

              // 发送页面加载成功消息
              window.addEventListener('load', () => {
                vscode.postMessage({
                  type: 'webview-loaded',
                  path: '${templatePath}'
                });
              });
            </script>
          </body>
          </html>
        `;

        log(`创建了调试HTML: 长度 ${debugHtml.length}`, 'info');
        return debugHtml;
      }

      // 构造全局样式表URI
      const globalStylesUri = webview.asWebviewUri(vscode.Uri.joinPath(
        extensionUri,
        'media',
        'global-styles.css'
      ));

      // 从文件系统中读取HTML模板
      // 修复模板路径，去掉前导的resources，因为extensionUri.fsPath已经指向扩展根目录
      const fixedPath = templatePath.startsWith('resources/') ? templatePath : `resources/${templatePath}`;
      const htmlPath = path.join(extensionUri.fsPath, fixedPath);

      log(`尝试加载WebView模板: ${htmlPath}`, 'info');
      console.log(`WebView模板路径: ${htmlPath}`);
      console.log(`扩展根目录: ${extensionUri.fsPath}`);
      console.log(`原始模板路径: ${templatePath}`);
      console.log(`修正后路径: ${fixedPath}`);

      if (!fs.existsSync(htmlPath)) {
        log(`WebView模板文件不存在: ${htmlPath}，将尝试查找备用路径`, 'error');

        // 尝试多个可能的路径
        const possiblePaths = [
          path.join(extensionUri.fsPath, templatePath),
          path.join(extensionUri.fsPath, templatePath.replace('webview/', 'webviews/')),
          path.join(extensionUri.fsPath, 'resources', templatePath)
        ];

        let foundPath = '';
        for (const altPath of possiblePaths) {
          log(`尝试备用路径: ${altPath}`, 'info');
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            log(`找到备用模板文件: ${altPath}`, 'info');
            break;
          }
        }

        if (!foundPath) {
          return this.getErrorHtml(`找不到模板文件: ${templatePath}`);
        }

        const html = fs.readFileSync(foundPath, 'utf8');

        if (!html || html.trim().length === 0) {
          log(`备用模板文件为空: ${foundPath}`, 'error');
          return this.getErrorHtml(`备用模板文件为空: ${foundPath}`);
        }

        // 替换CSP相关变量
        const nonce = this.generateNonce();
        let processedHtml = html.replace(/{{nonce}}/g, nonce);
        processedHtml = processedHtml.replace(/{{cspSource}}/g, webview.cspSource);

        log(`成功从备用路径加载WebView模板: ${foundPath}`, 'info');
        return processedHtml;
      }

      let html = fs.readFileSync(htmlPath, 'utf8');

      if (!html || html.trim().length === 0) {
        log(`WebView模板文件为空: ${htmlPath}`, 'error');
        return this.getErrorHtml(`模板文件为空: ${templatePath}`);
      }

      // 替换CSP相关变量
      const nonce = this.generateNonce();
      html = html.replace(/{{nonce}}/g, nonce);
      html = html.replace(/{{cspSource}}/g, webview.cspSource);
      
      // 添加全局样式表
      const headEndPos = html.indexOf('</head>');
      if (headEndPos !== -1) {
        const globalStyleLinkTag = `<link rel="stylesheet" type="text/css" href="${globalStylesUri}">`;
        html = html.slice(0, headEndPos) + globalStyleLinkTag + html.slice(headEndPos);
      }

      log(`WebView模板加载成功: ${templatePath}`, 'info');
      return html;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`加载HTML模板失败: ${errorMessage}`, 'error');
      // 返回备用HTML内容
      return fallbackHtml || this.getErrorHtml(errorMessage);
    }
  }

  /**
   * 生成随机nonce
   * @returns 随机字符串
   */
  public static generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 获取错误HTML
   * @param errorMessage 错误信息
   * @returns 错误HTML内容
   */
  private static getErrorHtml(errorMessage: string = "未知错误"): string {
    return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>加载失败</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          color: #e74c3c;
          text-align: center;
        }
        .error-container {
          margin-top: 40px;
        }
        h2 {
          margin-bottom: 20px;
        }
        .error-message {
          background-color: rgba(231, 76, 60, 0.1);
          padding: 10px;
          border-radius: 4px;
          margin: 20px 0;
          text-align: left;
          overflow-wrap: break-word;
        }
        .action {
          margin-top: 30px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h2>视图加载失败</h2>
        <p>无法加载WebView内容，请检查扩展配置是否正确。</p>
        <div class="error-message">错误信息: ${errorMessage}</div>
        <div class="action">
          <p>请尝试重启编辑器或重新安装扩展。</p>
        </div>
      </div>
    </body>
    </html>`;
  }
}