import * as vscode from 'vscode';
import { HistoryManager } from '../../core/history';
import { ResultPanel } from './result-panel';
import { log } from '../../utils/logger';

/**
 * 历史记录面板
 * 用于显示和管理历史记录
 */
export class HistoryPanel {
  public static currentPanel: HistoryPanel | undefined;
  
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly historyManager: HistoryManager;
  private disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示历史记录面板
   * @param extensionUri 扩展URI
   * @param historyManager 历史记录管理器
   */
  public static createOrShow(extensionUri: vscode.Uri, historyManager: HistoryManager): HistoryPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已经有面板，直接展示
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.panel.reveal(column);
      HistoryPanel.currentPanel.update();
      return HistoryPanel.currentPanel;
    }

    // 否则创建新面板
    const panel = vscode.window.createWebviewPanel(
      'ollamaHistory',
      'Ollama历史记录',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, historyManager);
    
    return HistoryPanel.currentPanel;
  }

  /**
   * 私有构造函数
   * @param panel WebView面板
   * @param extensionUri 扩展URI
   * @param historyManager 历史记录管理器
   */
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, historyManager: HistoryManager) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.historyManager = historyManager;

    // 更新面板内容
    this.update();

    // 处理面板关闭事件
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // 处理面板消息
    this.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'viewItem':
            await this.viewHistoryItem(message.id);
            break;
          case 'deleteItem':
            await this.deleteHistoryItem(message.id);
            break;
          case 'clearHistory':
            await this.clearHistory();
            break;
        }
      },
      null,
      this.disposables
    );
    
    log('历史记录面板已创建', 'info');
  }
  
  /**
   * 查看历史记录项
   * @param id 历史记录ID
   */
  private async viewHistoryItem(id: string): Promise<void> {
    const item = this.historyManager.getHistoryItem(id);
    if (item) {
      ResultPanel.createOrShow(this.extensionUri, item.result);
    }
  }
  
  /**
   * 删除历史记录项
   * @param id 历史记录ID
   */
  private async deleteHistoryItem(id: string): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      '确定要删除这条历史记录吗？',
      { modal: true },
      '删除'
    );
    
    if (result === '删除') {
      this.historyManager.deleteHistoryItem(id);
      this.update();
    }
  }
  
  /**
   * 清空历史记录
   */
  private async clearHistory(): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      '确定要清空所有历史记录吗？此操作不可撤销！',
      { modal: true },
      '清空'
    );
    
    if (result === '清空') {
      this.historyManager.clearHistory();
      this.update();
    }
  }

  /**
   * 更新面板内容
   */
  public update(): void {
    this.panel.webview.html = this.getHtml();
  }

  /**
   * 生成HTML
   * @returns HTML内容
   */
  private getHtml(): string {
    const webview = this.panel.webview;
    const historyItems = this.historyManager.getHistory();

    // 样式
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
      
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1em;
        padding-bottom: 0.5em;
        border-bottom: 1px solid var(--vscode-activityBarBadge-background);
      }
      
      .history-header h2 {
        margin: 0;
      }
      
      .clear-button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 8px;
        border-radius: 2px;
        cursor: pointer;
      }
      
      .clear-button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      
      .history-item {
        margin-bottom: 1em;
        padding: 1em;
        border-radius: 4px;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
      }
      
      .history-item-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5em;
      }
      
      .history-item-title {
        font-weight: bold;
        margin-bottom: 0.5em;
      }
      
      .history-item-meta {
        font-size: 0.9em;
        color: var(--vscode-descriptionForeground);
      }
      
      .history-item-summary {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
      }
      
      .history-item-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5em;
      }
      
      .action-button {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        padding: 4px 8px;
        border-radius: 2px;
        cursor: pointer;
      }
      
      .action-button:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
      }
      
      .view-button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      
      .view-button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      
      .delete-button {
        background-color: var(--vscode-errorForeground);
        color: white;
      }
      
      .delete-button:hover {
        opacity: 0.9;
      }
      
      .empty-message {
        text-align: center;
        padding: 2em;
        font-style: italic;
        color: var(--vscode-descriptionForeground);
      }
    `;

    // 生成nonce
    const nonce = this.getNonce();
    
    // 历史记录项HTML
    let historyItemsHtml = '';
    
    if (historyItems.length === 0) {
      historyItemsHtml = `<div class="empty-message">没有历史记录</div>`;
    } else {
      historyItemsHtml = historyItems.map(item => {
        const date = new Date(item.timestamp);
        const dateString = date.toLocaleString();
        
        return `
          <div class="history-item" data-id="${item.id}">
            <div class="history-item-header">
              <div class="history-item-title">${this.escapeHtml(item.question)}</div>
              <div class="history-item-meta">
                <span class="history-item-date">${dateString}</span>
                <span class="history-item-model">${item.model}</span>
              </div>
            </div>
            <div class="history-item-summary">${this.escapeHtml(item.summary)}</div>
            <div class="history-item-actions">
              <button class="action-button view-button" data-id="${item.id}">查看</button>
              <button class="action-button delete-button" data-id="${item.id}">删除</button>
            </div>
          </div>
        `;
      }).join('');
    }

    return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Ollama历史记录</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <div class="history-header">
        <h2>Ollama对话历史</h2>
        <button class="clear-button" id="clear-history">清空历史</button>
      </div>
      
      <div class="history-list">
        ${historyItemsHtml}
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // 查看按钮点击事件
        document.querySelectorAll('.view-button').forEach(button => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            vscode.postMessage({
              command: 'viewItem',
              id: id
            });
          });
        });
        
        // 删除按钮点击事件
        document.querySelectorAll('.delete-button').forEach(button => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            vscode.postMessage({
              command: 'deleteItem',
              id: id
            });
          });
        });
        
        // 清空历史按钮点击事件
        document.getElementById('clear-history').addEventListener('click', () => {
          vscode.postMessage({
            command: 'clearHistory'
          });
        });
      </script>
    </body>
    </html>`;
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
    HistoryPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log('历史记录面板已关闭', 'info');
  }
} 