/**
 * 流式处理器
 * 提供流式消息处理和代码块识别功能
 */
export class StreamProcessor {
  private buffer: string = '';
  private inCodeBlock: boolean = false;
  private currentLanguage: string = '';
  private codeContent: string = '';

  /**
   * 处理流式数据块
   * @param chunk 数据块
   * @returns 处理后的HTML片段
   */
  processChunk(chunk: string): string {
    this.buffer += chunk;
    
    // 检查是否包含代码块标记
    if (this.buffer.includes('```')) {
      return this.processCodeBlockContent();
    } else {
      // 常规文本处理
      const processed = this.processRegularText(chunk);
      return processed;
    }
  }
  
  /**
   * 处理常规文本内容
   * @param text 文本内容
   * @returns 处理后的HTML
   */
  private processRegularText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
  
  /**
   * 处理可能包含代码块的内容
   * @returns 处理后的HTML
   */
  private processCodeBlockContent(): string {
    const codeBlockMarker = '```';
    let result = '';
    
    // 查找代码块标记
    const startIndex = this.buffer.indexOf(codeBlockMarker);
    if (startIndex >= 0) {
      // 处理代码块之前的文本
      if (startIndex > 0) {
        result += this.processRegularText(this.buffer.substring(0, startIndex));
      }
      
      // 找到代码块开始
      if (!this.inCodeBlock) {
        // 进入代码块
        this.inCodeBlock = true;
        
        // 提取语言标识，如果有
        const langEndIndex = this.buffer.indexOf('\n', startIndex + 3);
        if (langEndIndex > 0) {
          this.currentLanguage = this.buffer.substring(startIndex + 3, langEndIndex).trim();
          
          // 记录代码块开始的HTML
          result += `<div class="code-block-container">
            <div class="code-block-header">
              <span class="code-block-language">${this.currentLanguage || 'plaintext'}</span>
              <button class="code-block-copy-button" onclick="copyToClipboard(this)">复制</button>
            </div>
            <pre class="code-block language-${this.currentLanguage || 'plaintext'}"><code>`;
          
          // 提取代码内容
          this.codeContent = this.buffer.substring(langEndIndex + 1);
          this.buffer = this.buffer.substring(langEndIndex + 1);
        }
      } else {
        // 已在代码块内，查找结束标记
        const endIndex = this.buffer.indexOf(codeBlockMarker);
        if (endIndex >= 0) {
          // 代码块结束
          this.inCodeBlock = false;
          
          // 添加代码内容
          result += this.escapeHtml(this.buffer.substring(0, endIndex));
          result += '</code></pre></div>';
          
          // 清理缓存
          this.buffer = this.buffer.substring(endIndex + 3);
          this.codeContent = '';
          this.currentLanguage = '';
          
          // 递归处理剩余内容
          if (this.buffer.length > 0) {
            result += this.processChunk('');
          }
        } else {
          // 代码块还未结束，累积代码内容
          result += this.escapeHtml(this.buffer);
          this.codeContent += this.buffer;
          this.buffer = '';
        }
      }
    } else if (this.inCodeBlock) {
      // 已在代码块内，但未找到结束标记
      result += this.escapeHtml(this.buffer);
      this.codeContent += this.buffer;
      this.buffer = '';
    } else {
      // 没有代码块标记，常规处理
      result += this.processRegularText(this.buffer);
      this.buffer = '';
    }
    
    return result;
  }
  
  /**
   * 转义HTML字符
   * @param content 内容
   * @returns 转义后的内容
   */
  private escapeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * 检测代码语言
   * @param content 代码内容
   * @returns 语言标识
   */
  private detectLanguage(content: string): string {
    // 简单语言检测逻辑
    if (/import\s+|export\s+|interface\s+|type\s+/.test(content)) {
      return 'typescript';
    }
    if (/def\s+|class\s+|import\s+|print\s*\(/.test(content)) {
      return 'python';
    }
    if (/public\s+class|private\s+|protected\s+|System\.out\.print/.test(content)) {
      return 'java';
    }
    return 'plaintext';
  }
} 