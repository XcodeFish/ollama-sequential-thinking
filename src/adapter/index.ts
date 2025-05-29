import * as vscode from 'vscode';
import { VSCodeAdapter } from './vscode';
import { CursorAdapter } from './cursor';
import { log } from '../utils/logger';
import { OllamaManager } from '../services';
import { OllamaClient } from '../api/client';
import { ContextCollector } from '../core/context';

/**
 * 编辑器适配器接口
 */
export interface IEditorAdapter {
  getActiveEditorContent(): string | undefined;
  insertText(text: string): Promise<boolean>;
  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  getOllamaClient(): OllamaClient;
}

/**
 * 编辑器适配器
 * 处理不同编辑器之间的差异
 */
export class EditorAdapter implements IEditorAdapter {
  private adapter: IEditorAdapter;
  private ollamaManager: OllamaManager;
  private client: OllamaClient;
  private contextCollector?: ContextCollector;

  /**
   * 构造函数
   * @param context 扩展上下文
   * @param editorType 编辑器类型
   */
  constructor(
    private context: vscode.ExtensionContext,
    private editorType: 'vscode' | 'cursor' | 'unknown'
  ) {
    // 获取Ollama管理器
    this.ollamaManager = OllamaManager.getInstance();
    
    // 根据编辑器类型选择适配器
    if (editorType === 'cursor') {
      this.adapter = new CursorAdapter(context, this.ollamaManager);
      log('使用Cursor适配器', 'info');
    } else {
      this.adapter = new VSCodeAdapter(context, this.ollamaManager);
      log('使用VSCode适配器', 'info');
    }
    
    // 获取Ollama客户端
    this.client = this.ollamaManager.getClient();

    log(`编辑器适配器已初始化, 类型: ${editorType}`, 'info');
  }

  /**
   * 获取当前编辑器内容
   */
  public getActiveEditorContent(): string | undefined {
    return this.adapter.getActiveEditorContent();
  }

  /**
   * 在编辑器中插入文本
   * @param text 要插入的文本
   */
  public async insertText(text: string): Promise<boolean> {
    return this.adapter.insertText(text);
  }

  /**
   * 显示消息
   * @param message 消息内容
   * @param type 消息类型
   */
  public showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.adapter.showMessage(message, type);
  }
  
  /**
   * 获取Ollama客户端
   * @returns Ollama客户端实例
   */
  public getOllamaClient(): OllamaClient {
    return this.adapter.getOllamaClient();
  }
  
  /**
   * 设置上下文收集器
   * @param collector 上下文收集器
   */
  public setContextCollector(collector: ContextCollector): void {
    this.contextCollector = collector;
    log('上下文收集器已设置', 'info');
  }
  
  /**
   * 获取上下文收集器
   * @returns 上下文收集器实例或undefined
   */
  public getContextCollector(): ContextCollector | undefined {
    return this.contextCollector;
  }
  
  /**
   * 获取当前代码上下文
   * @returns 代码上下文对象的Promise
   */
  public async getCodeContext() {
    if (this.contextCollector) {
      try {
        return await ContextCollector.collectContext();
      } catch (error) {
        log(`获取代码上下文失败: ${error}`, 'error');
        return undefined;
      }
    }
    return undefined;
  }
  
  /**
   * 释放资源
   */
  public dispose(): void {
    log('释放编辑器适配器资源', 'info');
    // 在这里添加需要释放的资源
    this.contextCollector = undefined;
  }
} 