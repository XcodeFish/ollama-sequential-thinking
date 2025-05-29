import * as vscode from 'vscode';
import * as path from 'path';
import { log } from '../../utils/logger';

/**
 * 上下文片段类型
 */
export enum ContextFragmentType {
  /** 代码片段 */
  CODE = 'code',
  /** 注释片段 */
  COMMENT = 'comment',
  /** 文本片段 */
  TEXT = 'text',
  /** 标记片段 */
  MARKER = 'marker'
}

/**
 * 上下文片段
 */
export interface ContextFragment {
  /** 片段类型 */
  type: ContextFragmentType;
  /** 片段内容 */
  content: string;
  /** 所属文件 */
  file?: string;
  /** 片段权重 */
  weight?: number;
  /** 片段元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 上下文集合
 */
export interface Context {
  /** 片段集合 */
  fragments: ContextFragment[];
  /** 主要焦点文件 */
  focusFile?: string;
  /** 全局上下文描述 */
  description?: string;
  /** 上下文创建时间 */
  timestamp: number;
}

/**
 * 代码上下文类型
 */
export interface CodeContext {
  /** 当前文件内容 */
  currentFileContent: string;
  /** 当前文件路径 */
  currentFilePath: string;
  /** 当前文件语言 */
  language: string;
  /** 相关文件内容 */
  relatedFiles: RelatedFile[];
  /** 项目结构摘要 */
  projectStructure: string;
}

/**
 * 相关文件
 */
export interface RelatedFile {
  /** 文件路径 */
  path: string;
  /** 文件内容摘要 */
  content: string;
  /** 相关性得分 (0-1) */
  relevance: number;
}

/**
 * 上下文管理器
 * 负责收集和管理代码上下文
 */
export class ContextManager {
  private maxContextSize: number;

  /**
   * 构造函数
   * @param maxContextSize 最大上下文大小(字符数)
   */
  constructor(maxContextSize: number = 5000) {
    this.maxContextSize = maxContextSize;
    log(`上下文管理器初始化，最大上下文大小: ${maxContextSize}字符`, 'info');
  }

  /**
   * 从当前编辑器状态收集上下文
   * @returns 上下文集合
   */
  public async collectFromEditor(): Promise<Context> {
    log('从编辑器收集上下文', 'info');
    const context: Context = {
      fragments: [],
      timestamp: Date.now()
    };

    try {
      // 获取当前活动编辑器
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        log('没有活动的编辑器', 'warning');
        return context;
      }

      // 设置焦点文件
      const focusFile = editor.document.fileName;
      context.focusFile = focusFile;
      
      // 添加当前文件内容
      const fileContent = editor.document.getText();
      context.fragments.push({
        type: ContextFragmentType.CODE,
        content: fileContent,
        file: focusFile,
        weight: 1.0
      });

      // 添加选中的代码
      if (!editor.selection.isEmpty) {
        const selectedText = editor.document.getText(editor.selection);
        context.fragments.push({
          type: ContextFragmentType.CODE,
          content: selectedText,
          file: focusFile,
          weight: 1.5, // 选中代码权重更高
          metadata: {
            isSelected: true
          }
        });
      }

      // TODO: 可以添加更多上下文，如相关文件、导入项等
      
      log(`上下文收集完成，片段数: ${context.fragments.length}`, 'info');
      return context;
    } catch (error) {
      log(`上下文收集失败: ${error}`, 'error');
      return context;
    }
  }

  /**
   * 将上下文限制到最大大小
   * @param context 上下文
   * @returns 裁剪后的上下文
   */
  public trimContext(context: Context): Context {
    // 按权重排序
    const sortedFragments = [...context.fragments].sort((a, b) => 
      (b.weight || 0) - (a.weight || 0)
    );

    let totalSize = 0;
    const trimmedFragments: ContextFragment[] = [];

    // 按权重添加，直到达到大小限制
    for (const fragment of sortedFragments) {
      const fragmentSize = fragment.content.length;
      if (totalSize + fragmentSize <= this.maxContextSize) {
        trimmedFragments.push(fragment);
        totalSize += fragmentSize;
      } else {
        // 如果单个片段太大，截取部分
        if (trimmedFragments.length === 0) {
          const truncatedContent = fragment.content.substring(0, this.maxContextSize);
          trimmedFragments.push({
            ...fragment,
            content: truncatedContent,
            metadata: {
              ...fragment.metadata,
              truncated: true
            }
          });
          totalSize = this.maxContextSize;
        }
        break;
      }
    }

    return {
      ...context,
      fragments: trimmedFragments
    };
  }

  /**
   * 将上下文转换为字符串
   * @param context 上下文
   * @returns 字符串表示
   */
  public contextToString(context: Context): string {
    let result = '';
    
    for (const fragment of context.fragments) {
      switch (fragment.type) {
        case ContextFragmentType.CODE:
          result += `文件: ${fragment.file || '未知'}\n`;
          result += '```\n' + fragment.content + '\n```\n\n';
          break;
        case ContextFragmentType.COMMENT:
          result += `注释:\n${fragment.content}\n\n`;
          break;
        case ContextFragmentType.TEXT:
          result += `${fragment.content}\n\n`;
          break;
        case ContextFragmentType.MARKER:
          result += `--- ${fragment.content} ---\n\n`;
          break;
      }
    }

    return result.trim();
  }
}

/**
 * 上下文收集器
 * 负责收集代码上下文信息
 */
export class ContextCollector {
  /**
   * 收集当前上下文
   * @returns 上下文对象
   */
  public static async collectContext(): Promise<CodeContext> {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        return this.createEmptyContext();
      }
      
      // 当前文件信息
      const currentFilePath = editor.document.uri.fsPath;
      const currentFileContent = editor.document.getText();
      const language = editor.document.languageId;
      
      // 收集项目结构
      const projectStructure = await this.collectProjectStructure();
      
      // 收集相关文件
      const relatedFiles = await this.collectRelatedFiles(currentFilePath, language);
      
      return {
        currentFileContent,
        currentFilePath,
        language,
        relatedFiles,
        projectStructure
      };
    } catch (error) {
      log(`收集上下文失败: ${error}`, 'error');
      return this.createEmptyContext();
    }
  }
  
  /**
   * 创建空上下文
   * @returns 空上下文对象
   */
  private static createEmptyContext(): CodeContext {
    return {
      currentFileContent: '',
      currentFilePath: '',
      language: '',
      relatedFiles: [],
      projectStructure: ''
    };
  }
  
  /**
   * 收集项目结构
   * @returns 项目结构摘要
   */
  private static async collectProjectStructure(): Promise<string> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return '无工作区';
      }
      
      const rootPath = workspaceFolders[0].uri.fsPath;
      
      // 获取重要文件和目录
      const packageJson = await this.tryReadFile(path.join(rootPath, 'package.json'));
      const tsConfig = await this.tryReadFile(path.join(rootPath, 'tsconfig.json'));
      
      // 生成目录结构摘要
      const structureSummary = await this.generateDirectoryStructure(rootPath);
      
      return `
项目结构摘要:
${structureSummary}

${packageJson ? `项目配置:
${this.summarizePackageJson(packageJson)}` : ''}

${tsConfig ? `TypeScript配置:
${this.summarizeTsConfig(tsConfig)}` : ''}
      `.trim();
    } catch (error) {
      log(`收集项目结构失败: ${error}`, 'error');
      return '无法收集项目结构';
    }
  }
  
  /**
   * 生成目录结构摘要
   * @param rootPath 根路径
   * @returns 目录结构摘要
   */
  private static async generateDirectoryStructure(rootPath: string): Promise<string> {
    try {
      // 使用VSCode API查找主要目录
      const mainDirs = ['src', 'lib', 'app', 'components', 'pages', 'public', 'assets'];
      let structure = '';
      
      for (const dir of mainDirs) {
        const uri = vscode.Uri.file(path.join(rootPath, dir));
        try {
          const entries = await vscode.workspace.fs.readDirectory(uri);
          if (entries.length > 0) {
            structure += `/${dir}/\n`;
            // 添加重要子目录和文件
            entries.forEach(([name, type]) => {
              const prefix = type === vscode.FileType.Directory ? '  ├─ ' : '  │  ';
              structure += `${prefix}${name}${type === vscode.FileType.Directory ? '/' : ''}\n`;
            });
          }
        } catch (e) {
          // 目录不存在，跳过
        }
      }
      
      return structure || '未找到标准项目目录';
    } catch (error) {
      log(`生成目录结构失败: ${error}`, 'error');
      return '无法生成目录结构';
    }
  }
  
  /**
   * 收集相关文件
   * @param currentFilePath 当前文件路径
   * @param language 当前语言
   * @returns 相关文件数组
   */
  private static async collectRelatedFiles(currentFilePath: string, language: string): Promise<RelatedFile[]> {
    const relatedFiles: RelatedFile[] = [];
    
    try {
      // 确定文件扩展名
      const fileExt = path.extname(currentFilePath);
      
      // 根据语言和扩展名确定搜索模式
      const pattern = this.getSearchPatternForLanguage(language, fileExt);
      
      // 查找相关文件
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 5);
      
      // 排除当前文件
      const filteredFiles = files.filter(file => file.fsPath !== currentFilePath);
      
      // 读取文件内容并计算相关性
      for (const file of filteredFiles) {
        try {
          const content = await this.readFileContent(file.fsPath);
          const relevance = this.calculateRelevance(currentFilePath, file.fsPath);
          
          relatedFiles.push({
            path: file.fsPath,
            content: this.summarizeContent(content),
            relevance
          });
        } catch (e) {
          // 跳过无法读取的文件
        }
      }
      
      // 按相关性排序
      return relatedFiles.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      log(`收集相关文件失败: ${error}`, 'error');
      return [];
    }
  }
  
  /**
   * 根据语言获取搜索模式
   * @param language 语言
   * @param fileExt 文件扩展名
   * @returns 搜索模式
   */
  private static getSearchPatternForLanguage(language: string, fileExt: string): string {
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
        return '**/*.{ts,tsx}';
      case 'javascript':
      case 'javascriptreact':
        return '**/*.{js,jsx}';
      case 'vue':
        return '**/*.vue';
      case 'python':
        return '**/*.py';
      case 'java':
        return '**/*.java';
      case 'csharp':
        return '**/*.cs';
      case 'go':
        return '**/*.go';
      default:
        return `**/*${fileExt}`;
    }
  }
  
  /**
   * 计算文件相关性
   * @param currentPath 当前文件路径
   * @param targetPath 目标文件路径
   * @returns 相关性得分 (0-1)
   */
  private static calculateRelevance(currentPath: string, targetPath: string): number {
    // 简单相关性计算：目录相似度
    const currentDir = path.dirname(currentPath);
    const targetDir = path.dirname(targetPath);
    
    // 同目录文件相关性高
    if (currentDir === targetDir) {
      return 0.9;
    }
    
    // 文件名相似性
    const currentBase = path.basename(currentPath, path.extname(currentPath));
    const targetBase = path.basename(targetPath, path.extname(targetPath));
    
    if (targetBase.includes(currentBase) || currentBase.includes(targetBase)) {
      return 0.8;
    }
    
    // 父子目录关系
    if (currentDir.startsWith(targetDir) || targetDir.startsWith(currentDir)) {
      return 0.7;
    }
    
    // 默认相关性
    return 0.5;
  }
  
  /**
   * 内容摘要
   * @param content 内容
   * @returns 摘要
   */
  private static summarizeContent(content: string): string {
    // 提取内容的前几行作为摘要
    const lines = content.split('\n');
    const summary = lines.slice(0, 10).join('\n');
    
    return summary + (lines.length > 10 ? '...' : '');
  }
  
  /**
   * 读取文件内容
   * @param filePath 文件路径
   * @returns 文件内容
   */
  private static async readFileContent(filePath: string): Promise<string> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(content).toString('utf-8');
    } catch (error) {
      log(`读取文件失败: ${filePath}, ${error}`, 'error');
      throw error;
    }
  }
  
  /**
   * 尝试读取文件
   * @param filePath 文件路径
   * @returns 文件内容或null
   */
  private static async tryReadFile(filePath: string): Promise<string | null> {
    try {
      return await this.readFileContent(filePath);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 提取package.json摘要
   * @param content package.json内容
   * @returns 摘要
   */
  private static summarizePackageJson(content: string): string {
    try {
      const pkg = JSON.parse(content);
      return `
名称: ${pkg.name || '未知'}
版本: ${pkg.version || '未知'}
主要依赖:
${Object.entries(pkg.dependencies || {})
  .slice(0, 5)
  .map(([name, version]) => `  - ${name}: ${version}`)
  .join('\n')}
${Object.keys(pkg.dependencies || {}).length > 5 ? '  - ...' : ''}
      `.trim();
    } catch (error) {
      return '无法解析package.json';
    }
  }
  
  /**
   * 提取tsconfig.json摘要
   * @param content tsconfig.json内容
   * @returns 摘要
   */
  private static summarizeTsConfig(content: string): string {
    try {
      const tsConfig = JSON.parse(content);
      return `
编译选项:
  - target: ${tsConfig.compilerOptions?.target || '未知'}
  - module: ${tsConfig.compilerOptions?.module || '未知'}
  - strict: ${tsConfig.compilerOptions?.strict ? '是' : '否'}
      `.trim();
    } catch (error) {
      return '无法解析tsconfig.json';
    }
  }
} 