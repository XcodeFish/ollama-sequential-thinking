/**
 * 动态语言检测器
 * 提供代码语言自动检测功能
 */
export class LanguageDetector {
  /**
   * 检测代码语言
   * @param code 代码内容
   * @returns 识别出的语言标识符
   */
  public static detectLanguage(code: string): string {
    // TypeScript特征
    if (/import|export|interface|type\s+\w+|class\s+\w+\s*implements|<\w+>/i.test(code)) {
      return 'typescript';
    }
    
    // JavaScript特征
    if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|require\(/i.test(code)) {
      return 'javascript';
    }
    
    // Python特征
    if (/def\s+\w+|class\s+\w+|import\s+\w+|from\s+\w+\s+import|print\s*\(/i.test(code)) {
      return 'python';
    }
    
    // Java特征
    if (/public\s+class|private\s+\w+|protected\s+\w+|System\.out|void\s+\w+/i.test(code)) {
      return 'java';
    }
    
    // HTML特征
    if (/<html|<body|<div|<span|<p>|<\/\w+>/i.test(code)) {
      return 'html';
    }
    
    // CSS特征
    if (/\.\w+\s*\{|@media|@keyframes/i.test(code)) {
      return 'css';
    }
    
    // C#特征
    if (/using\s+\w+;|namespace\s+\w+|class\s+\w+\s*:|public\s+\w+\s+\w+\s*\(/i.test(code)) {
      return 'csharp';
    }
    
    // Go特征
    if (/package\s+\w+|func\s+\w+|import\s+"|go\s+func/i.test(code)) {
      return 'go';
    }
    
    // 其他语言检测...
    
    // 默认返回文本类型
    return 'plaintext';
  }

  /**
   * 获取语言的显示名称
   * @param langId 语言标识符
   * @returns 显示名称
   */
  public static getDisplayName(langId: string): string {
    const langMap: Record<string, string> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      java: 'Java',
      html: 'HTML',
      css: 'CSS',
      csharp: 'C#',
      go: 'Go',
      rust: 'Rust',
      ruby: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
      kotlin: 'Kotlin',
      shell: 'Shell',
      sql: 'SQL',
      xml: 'XML',
      json: 'JSON',
      yaml: 'YAML',
      plaintext: '文本'
    };

    return langMap[langId] || langId;
  }
} 