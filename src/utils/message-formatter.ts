import { MarkdownProcessor } from './markdown-processor';

/**
 * 消息格式化器
 * 提供聊天消息格式化功能
 */
export class MessageFormatter {
  /**
   * 格式化聊天消息
   * @param content 消息内容
   * @param isUser 是否为用户消息
   * @returns 格式化后的HTML
   */
  public static formatMessage(content: string, isUser: boolean = false): string {
    if (!content) {return '';}
    
    // 1. 处理Markdown格式
    const htmlContent = MarkdownProcessor.processMarkdown(content);
    
    // 2. 添加消息样式
    const messageType = isUser ? 'user-message' : 'assistant-message';
    const sender = isUser ? '用户' : 'AI助手';
    const time = new Date().toLocaleTimeString();
    
    return `
    <div class="message-container ${messageType}">
      <div class="message-header">
        <span class="message-sender">${sender}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">
        ${htmlContent}
      </div>
    </div>`;
  }
  
  /**
   * 格式化系统消息
   * @param content 消息内容
   * @returns 格式化后的HTML
   */
  public static formatSystemMessage(content: string): string {
    return `
    <div class="message-container system-message">
      <div class="message-content">
        <em>${content}</em>
      </div>
    </div>`;
  }
  
  /**
   * 格式化错误消息
   * @param error 错误内容
   * @returns 格式化后的HTML
   */
  public static formatErrorMessage(error: string): string {
    return `
    <div class="message-container error-message">
      <div class="message-header">
        <span class="message-sender">错误</span>
      </div>
      <div class="message-content">
        <div class="error-content">${error}</div>
      </div>
    </div>`;
  }
  
  /**
   * 解析代码示例块
   * @param content 包含代码示例的内容
   * @returns 解析后的内容
   */
  public static parseCodeExamples(content: string): string {
    // 匹配<example>...</example>形式的代码示例
    return content.replace(/<example>([\s\S]*?)<\/example>/g, (match, exampleContent) => {
      // 将示例内容包装在代码块中
      return `\n\n**示例代码**\n\`\`\`typescript\n${exampleContent.trim()}\n\`\`\`\n\n`;
    });
  }
  
  /**
   * 处理流式响应
   * @param chunk 响应数据块
   * @returns 处理后的HTML片段
   */
  public static processStreamChunk(chunk: string): string {
    if (!chunk) { return ''; }
    
    // 检测代码块边界
    const codeBlockStart = '```';
    const codeBlockStartIndex = chunk.indexOf(codeBlockStart);
    
    // 如果这个chunk没有代码块标记，进行基本处理
    if (codeBlockStartIndex === -1) {
      return chunk
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // 如果有代码块标记，需要保留不转义，后续由Markdown处理器处理
    return chunk;
  }
} 