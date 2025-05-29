import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ThinkingResult } from '../engine';
import { log } from '../../utils/logger';

/**
 * 历史记录条目
 */
export interface HistoryItem {
  /** 结果ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 问题 */
  question: string;
  /** 结果摘要 */
  summary: string;
  /** 使用的模型 */
  model: string;
  /** 完整结果 */
  result: ThinkingResult;
}

/**
 * 历史记录管理器
 * 管理问答历史记录
 */
export class HistoryManager {
  private static instance: HistoryManager;
  private historyItems: HistoryItem[] = [];
  private historyFile: string;
  private maxHistoryItems: number;
  
  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager(context);
    }
    return HistoryManager.instance;
  }
  
  /**
   * 私有构造函数
   */
  private constructor(context: vscode.ExtensionContext) {
    const storagePath = context.globalStoragePath;
    
    // 确保存储目录存在
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    
    this.historyFile = path.join(storagePath, 'history.json');
    
    // 读取配置
    const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
    this.maxHistoryItems = config.get<number>('maxHistoryItems') || 50;
    
    // 加载历史记录
    this.loadHistory();
    
    log('历史记录管理器已初始化', 'info');
  }
  
  /**
   * 获取所有历史记录
   */
  public getHistory(): HistoryItem[] {
    return [...this.historyItems];
  }
  
  /**
   * 根据ID获取历史记录
   * @param id 历史记录ID
   */
  public getHistoryItem(id: string): HistoryItem | undefined {
    return this.historyItems.find(item => item.id === id);
  }
  
  /**
   * 添加历史记录
   * @param result 思考结果
   */
  public addHistoryItem(result: ThinkingResult): HistoryItem {
    // 生成唯一ID
    const id = this.generateId();
    
    // 创建历史记录项
    const historyItem: HistoryItem = {
      id,
      timestamp: Date.now(),
      question: result.question,
      summary: this.generateSummary(result),
      model: result.model,
      result
    };
    
    // 添加到历史记录
    this.historyItems.unshift(historyItem);
    
    // 限制历史记录数量
    if (this.historyItems.length > this.maxHistoryItems) {
      this.historyItems = this.historyItems.slice(0, this.maxHistoryItems);
    }
    
    // 保存历史记录
    this.saveHistory();
    
    log(`添加历史记录: ${id}`, 'info');
    return historyItem;
  }
  
  /**
   * 删除历史记录
   * @param id 历史记录ID
   */
  public deleteHistoryItem(id: string): boolean {
    const initialLength = this.historyItems.length;
    this.historyItems = this.historyItems.filter(item => item.id !== id);
    
    const deleted = initialLength > this.historyItems.length;
    
    if (deleted) {
      this.saveHistory();
      log(`删除历史记录: ${id}`, 'info');
    }
    
    return deleted;
  }
  
  /**
   * 清空历史记录
   */
  public clearHistory(): void {
    this.historyItems = [];
    this.saveHistory();
    log('清空历史记录', 'info');
  }
  
  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.historyItems = JSON.parse(data);
        log(`加载了${this.historyItems.length}条历史记录`, 'info');
      }
    } catch (error) {
      log(`加载历史记录失败: ${error}`, 'error');
      this.historyItems = [];
    }
  }
  
  /**
   * 保存历史记录
   */
  private saveHistory(): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.historyItems, null, 2), 'utf8');
      log('历史记录已保存', 'info');
    } catch (error) {
      log(`保存历史记录失败: ${error}`, 'error');
    }
  }
  
  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * 生成摘要
   * @param result 思考结果
   */
  private generateSummary(result: ThinkingResult): string {
    // 简单地截取结果的前100个字符作为摘要
    const summary = result.result.substring(0, 100).trim();
    return summary + (result.result.length > 100 ? '...' : '');
  }
} 