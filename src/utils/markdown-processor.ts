import { SyntaxHighlighter } from './syntax-highlighter';

/**
 * Markdown处理器
 * 提供Markdown内容解析和转换功能
 */
export class MarkdownProcessor {
  /**
   * 将Markdown转换为HTML
   * @param markdown Markdown内容
   * @returns 转换后的HTML内容
   */
  public static processMarkdown(markdown: string): string {
    if (!markdown) {return '';}

    // 处理代码块 (```)
    let content = this.processCodeBlocks(markdown);
    
    // 处理行内代码 (`)
    content = this.processInlineCode(content);
    
    // 处理标题 (# 标题)
    content = this.processHeadings(content);
    
    // 处理列表
    content = this.processLists(content);
    
    // 处理强调 (**粗体** 和 *斜体*)
    content = this.processEmphasis(content);
    
    // 处理链接 [文本](URL)
    content = this.processLinks(content);
    
    // 处理段落
    content = this.processParagraphs(content);

    return content;
  }

  /**
   * 处理代码块
   * @param markdown Markdown内容
   * @returns 处理后的内容
   */
  private static processCodeBlocks(markdown: string): string {
    return markdown.replace(/```(\w*)?[\n\r]([\s\S]*?)```/g, (match, lang, code) => {
      const language = (lang || '').trim() || 'plaintext';
      // 使用语法高亮处理代码
      const highlightedCode = SyntaxHighlighter.highlightCode(code, language);
      // 包装成代码块
      return `<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-block-language">${language}</span>
          <button class="code-block-copy-button" onclick="copyToClipboard(this)">复制</button>
        </div>
        <pre class="code-block language-${language}"><code>${highlightedCode}</code></pre>
      </div>`;
    });
  }

  /**
   * 处理行内代码
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processInlineCode(content: string): string {
    return content.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="inline-code">${code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</code>`;
    });
  }
  
  /**
   * 处理标题
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processHeadings(content: string): string {
    return content
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>');
  }
  
  /**
   * 处理列表
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processLists(content: string): string {
    // 处理无序列表
    let result = content.replace(/^\s*[*\-+]\s+(.*)/gm, '<li>$1</li>');
    // 替换连续的<li>标签为完整的无序列表
    result = result.replace(/(<li>.*?<\/li>\n)+/gs, '<ul>$&</ul>');
    
    // 处理有序列表
    result = result.replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>');
    // 替换连续的<li>标签为完整的有序列表
    result = result.replace(/(<li>.*?<\/li>\n)+/gs, '<ol>$&</ol>');
    
    return result;
  }
  
  /**
   * 处理强调
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processEmphasis(content: string): string {
    // 粗体
    let result = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // 斜体
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    result = result.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return result;
  }
  
  /**
   * 处理链接
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processLinks(content: string): string {
    return content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  }
  
  /**
   * 处理段落
   * @param content 文本内容
   * @returns 处理后的内容
   */
  private static processParagraphs(content: string): string {
    // 添加段落标签
    const result = content;
    
    // 已经有HTML标签的行不添加段落标签
    const htmlRegex = /<\/?[a-z][\s\S]*?>/i;
    const lines = result.split('\n');
    const processed = lines.map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !htmlRegex.test(trimmedLine)) {
        return `<p>${trimmedLine}</p>`;
      }
      return line;
    });
    
    return processed.join('\n');
  }
  
  /**
   * 获取Markdown样式
   * @returns Markdown样式
   */
  public static getMarkdownStyles(): string {
    return `
    /* Markdown样式 */
    h1, h2, h3, h4, h5, h6 {
      color: var(--vscode-editor-foreground);
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 16px;
    }
    
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.4em; }
    h3 { font-size: 1.2em; }
    h4 { font-size: 1.1em; }
    h5, h6 { font-size: 1em; }
    
    p {
      margin-top: 8px;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    
    ul, ol {
      padding-left: 24px;
      margin: 8px 0;
    }
    
    li {
      margin: 4px 0;
    }
    
    a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    em {
      font-style: italic;
    }
    
    strong {
      font-weight: bold;
    }
    `;
  }
} 