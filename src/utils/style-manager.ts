import { CodeFormatter } from './code-formatter';
import { SyntaxHighlighter } from './syntax-highlighter';
import { MarkdownProcessor } from './markdown-processor';

/**
 * 样式管理器
 * 提供集中管理和生成样式的功能
 */
export class StyleManager {
  /**
   * 获取所有CSS样式
   * @returns 合并后的CSS样式
   */
  public static getAllStyles(): string {
    return `
    ${this.getBaseStyles()}
    ${CodeFormatter.getCodeBlockStyles()}
    ${SyntaxHighlighter.getHighlightStyles()}
    ${MarkdownProcessor.getMarkdownStyles()}
    `;
  }
  
  /**
   * 获取基础CSS样式
   * @returns 基础CSS样式
   */
  private static getBaseStyles(): string {
    return `
    /* 基础容器样式 */
    .message-container {
      padding: 8px;
      margin-bottom: 16px;
      border-radius: 4px;
      background-color: var(--vscode-editor-background);
    }
    
    .user-message {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
    }
    
    .assistant-message {
      background-color: var(--vscode-editor-selectionBackground);
    }
    
    /* 消息元数据样式 */
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
    }
    
    .message-sender {
      font-weight: bold;
      color: var(--vscode-editor-foreground);
    }
    
    .message-time {
      font-size: 0.8em;
      color: var(--vscode-descriptionForeground);
    }
    
    .message-content {
      padding: 8px 0;
      line-height: 1.5;
    }
    `;
  }
  
  /**
   * 获取WebView所需的脚本
   * @returns JavaScript脚本代码
   */
  public static getScripts(): string {
    return `
    ${CodeFormatter.getCopyCodeScript()}
    
    // 监听主题变化
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'theme-changed') {
        document.body.className = message.theme;
      }
    });
    `;
  }
} 