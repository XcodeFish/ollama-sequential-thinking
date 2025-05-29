/**
 * 语法高亮处理器
 * 提供简化版的代码语法高亮功能
 */
export class SyntaxHighlighter {
  // 不同语言的语法规则定义
  private static syntaxRules: Record<string, Array<{pattern: RegExp, className: string}>> = {
    // TypeScript/JavaScript语法规则
    typescript: [
      { pattern: /(import|export|from|as|interface|type|class|extends|implements|function|return|if|else|for|while|switch|case|default|try|catch|finally|throw|async|await|new|this)\b/g, className: 'keyword' },
      { pattern: /(string|number|boolean|any|void|undefined|null|never|object|symbol|bigint|unknown)\b/g, className: 'type' },
      { pattern: /(console|document|window|Array|Object|Promise|Set|Map|Math|Date|JSON)\b/g, className: 'builtin' },
      { pattern: /("|')((?:\\\1|.)*?)\1/g, className: 'string' },
      { pattern: /\/\/.*$/gm, className: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
      { pattern: /\b([0-9]+)\b/g, className: 'number' }
    ],
    
    // 与TypeScript规则重用，添加一些JavaScript特有的规则
    javascript: [
      { pattern: /(import|export|from|as|class|extends|function|return|if|else|for|while|switch|case|default|try|catch|finally|throw|async|await|new|this)\b/g, className: 'keyword' },
      { pattern: /(undefined|null|NaN|Infinity)\b/g, className: 'type' },
      { pattern: /(console|document|window|Array|Object|Promise|Set|Map|Math|Date|JSON)\b/g, className: 'builtin' },
      { pattern: /("|')((?:\\\1|.)*?)\1/g, className: 'string' },
      { pattern: /\/\/.*$/gm, className: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
      { pattern: /\b([0-9]+)\b/g, className: 'number' }
    ],
    
    // Python语法规则
    python: [
      { pattern: /(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|pass|break|continue|lambda|in|is|not|and|or)\b/g, className: 'keyword' },
      { pattern: /(int|str|bool|float|list|tuple|dict|set|None|True|False)\b/g, className: 'type' },
      { pattern: /(print|len|range|open|map|filter|sorted|enumerate|zip|input|super|property)\b/g, className: 'builtin' },
      { pattern: /("""|'''|"|')((?:\\\1|.)*?)\1/g, className: 'string' },
      { pattern: /#.*$/gm, className: 'comment' },
      { pattern: /\b([0-9]+)\b/g, className: 'number' }
    ],
    
    // HTML语法规则
    html: [
      { pattern: /(&lt;[a-z][^\s&]*?)(\s.*?)?(&gt;)/gi, className: 'tag' },
      { pattern: /(&lt;\/[a-z][^\s&]*?)(\s.*?)?(&gt;)/gi, className: 'tag' },
      { pattern: /([a-z]+)=(&quot;|')(.*?)(\2)/gi, className: 'attribute' },
      { pattern: /&lt;!--[\s\S]*?--&gt;/g, className: 'comment' }
    ],
    
    // CSS语法规则
    css: [
      { pattern: /([.#][a-z0-9_-]+)/gi, className: 'selector' },
      { pattern: /([@][a-z0-9_-]+)/gi, className: 'at-rule' },
      { pattern: /\{([\s\S]*?)\}/g, className: 'block' },
      { pattern: /([a-z-]+\s*:)/gi, className: 'property' },
      { pattern: /(#[a-f0-9]{3,6})\b/gi, className: 'color' },
      { pattern: /(\d+\.?\d*(px|em|rem|%|vh|vw))/g, className: 'unit' },
      { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' }
    ]
  };
  
  /**
   * 为默认支持的语言添加简单高亮
   * @param code 要高亮的代码
   * @param language 语言标识符
   * @returns HTML代码，包含高亮标记
   */
  public static highlightCode(code: string, language: string): string {
    // 如果没有对应语言的规则，尝试使用通用规则或返回未高亮的代码
    const rules = this.syntaxRules[language.toLowerCase()] || this.syntaxRules['typescript'] || [];
    
    // 首先对HTML特殊字符进行转义
    let escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // 应用语法高亮规则
    for (const rule of rules) {
      escapedCode = escapedCode.replace(rule.pattern, (match, ...args) => {
        // 不同规则可能有不同的捕获组结构
        if (language === 'html' && rule.className === 'tag') {
          // HTML标签特殊处理
          return `<span class="token ${rule.className}">${args[0]}${args[1] ? args[1] : ''}${args[2]}</span>`;
        } else if (rule.className === 'string' || rule.className === 'comment') {
          // 字符串和注释特殊处理
          return `<span class="token ${rule.className}">${match}</span>`;
        } else {
          // 默认处理
          return `<span class="token ${rule.className}">${args[0] || match}</span>`;
        }
      });
    }
    
    return escapedCode;
  }
  
  /**
   * 获取语法高亮的CSS样式
   * @returns 语法高亮的CSS样式
   */
  public static getHighlightStyles(): string {
    return `
    /* 代码语法高亮 - 深色主题 */
    .vscode-dark .token.keyword { color: #569CD6; }
    .vscode-dark .token.type { color: #4EC9B0; }
    .vscode-dark .token.builtin { color: #DCDCAA; }
    .vscode-dark .token.string { color: #CE9178; }
    .vscode-dark .token.comment { color: #6A9955; }
    .vscode-dark .token.number { color: #B5CEA8; }
    .vscode-dark .token.tag { color: #569CD6; }
    .vscode-dark .token.attribute { color: #9CDCFE; }
    .vscode-dark .token.selector { color: #D7BA7D; }
    .vscode-dark .token.property { color: #9CDCFE; }
    .vscode-dark .token.at-rule { color: #C586C0; }
    .vscode-dark .token.color { color: #CE9178; }
    .vscode-dark .token.unit { color: #B5CEA8; }
    
    /* 代码语法高亮 - 浅色主题 */
    .vscode-light .token.keyword { color: #0000FF; }
    .vscode-light .token.type { color: #267F99; }
    .vscode-light .token.builtin { color: #795E26; }
    .vscode-light .token.string { color: #A31515; }
    .vscode-light .token.comment { color: #008000; }
    .vscode-light .token.number { color: #098658; }
    .vscode-light .token.tag { color: #800000; }
    .vscode-light .token.attribute { color: #FF0000; }
    .vscode-light .token.selector { color: #800000; }
    .vscode-light .token.property { color: #FF0000; }
    .vscode-light .token.at-rule { color: #AF00DB; }
    .vscode-light .token.color { color: #A31515; }
    .vscode-light .token.unit { color: #098658; }
    `;
  }
} 