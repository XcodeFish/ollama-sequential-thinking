import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ThinkingResult } from '../engine';
import { log } from '../../utils/logger';

/**
 * 缓存条目
 */
export interface CacheItem {
  /** 缓存ID */
  id: string;
  /** 查询文本 */
  query: string;
  /** 上下文哈希 */
  contextHash: string;
  /** 时间戳 */
  timestamp: number;
  /** 模型名称 */
  model: string;
  /** 缓存的思考结果 */
  result: ThinkingResult;
}

/**
 * 离线缓存管理器
 * 管理思考结果的离线缓存
 */
export class CacheManager {
  private static instance: CacheManager;
  private cacheItems: Map<string, CacheItem> = new Map();
  private cacheDir: string;
  private maxCacheItems: number;
  private enableCache: boolean;
  
  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(context);
    }
    return CacheManager.instance;
  }
  
  /**
   * 私有构造函数
   */
  private constructor(context: vscode.ExtensionContext) {
    const storagePath = context.globalStoragePath;
    this.cacheDir = path.join(storagePath, 'cache');
    
    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // 读取配置
    const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
    this.maxCacheItems = config.get<number>('cacheMaxItems') || 20;
    this.enableCache = config.get<boolean>('enableOfflineCache') || true;
    
    // 加载缓存
    this.loadCache();
    
    // 监听配置变化
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ollama-sequential-thinking.enableOfflineCache') ||
          e.affectsConfiguration('ollama-sequential-thinking.cacheMaxItems')) {
        // 更新配置
        const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
        this.maxCacheItems = config.get<number>('cacheMaxItems') || 20;
        this.enableCache = config.get<boolean>('enableOfflineCache') || true;
        
        // 如果禁用了缓存，清空内存中的缓存
        if (!this.enableCache) {
          this.cacheItems.clear();
        } else {
          // 重新加载缓存
          this.loadCache();
        }
      }
    });
    
    log('缓存管理器已初始化', 'info');
  }
  
  /**
   * 获取缓存
   * @param query 查询文本
   * @param contextText 上下文文本
   * @param model 模型名称
   * @returns 缓存项或undefined
   */
  public getCache(query: string, contextText: string, model: string): ThinkingResult | undefined {
    if (!this.enableCache) {
      return undefined;
    }
    
    const cacheKey = this.generateCacheKey(query, contextText, model);
    const cacheItem = this.cacheItems.get(cacheKey);
    
    if (cacheItem) {
      log(`命中缓存: ${cacheKey}`, 'info');
      return cacheItem.result;
    }
    
    return undefined;
  }
  
  /**
   * 添加缓存
   * @param query 查询文本
   * @param contextText 上下文文本
   * @param result 思考结果
   */
  public addCache(query: string, contextText: string, result: ThinkingResult): void {
    if (!this.enableCache) {
      return;
    }
    
    const cacheKey = this.generateCacheKey(query, contextText, result.model);
    const contextHash = this.generateContextHash(contextText);
    
    const cacheItem: CacheItem = {
      id: cacheKey,
      query,
      contextHash,
      timestamp: Date.now(),
      model: result.model,
      result
    };
    
    // 添加到内存缓存
    this.cacheItems.set(cacheKey, cacheItem);
    
    // 保存到磁盘
    this.saveCacheItem(cacheItem);
    
    // 限制缓存数量
    this.trimCache();
    
    log(`添加缓存: ${cacheKey}`, 'info');
  }
  
  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.cacheItems.clear();
    
    // 删除所有缓存文件
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
      log('清空缓存', 'info');
    } catch (error) {
      log(`清空缓存失败: ${error}`, 'error');
    }
  }
  
  /**
   * 生成缓存键
   * @param query 查询文本
   * @param contextText 上下文文本
   * @param model 模型名称
   * @returns 缓存键
   */
  private generateCacheKey(query: string, contextText: string, model: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    const contextHash = this.generateContextHash(contextText);
    const input = `${normalizedQuery}|${contextHash}|${model}`;
    return crypto.createHash('md5').update(input).digest('hex');
  }
  
  /**
   * 生成上下文哈希
   * @param contextText 上下文文本
   * @returns 上下文哈希
   */
  private generateContextHash(contextText: string): string {
    if (!contextText) {
      return 'empty';
    }
    return crypto.createHash('md5').update(contextText).digest('hex');
  }
  
  /**
   * 加载缓存
   */
  private loadCache(): void {
    if (!this.enableCache) {
      return;
    }
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      let loadedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json') && loadedCount < this.maxCacheItems) {
          try {
            const filePath = path.join(this.cacheDir, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const cacheItem: CacheItem = JSON.parse(data);
            
            // 添加到内存缓存
            this.cacheItems.set(cacheItem.id, cacheItem);
            loadedCount++;
          } catch (e) {
            // 跳过损坏的缓存文件
          }
        }
      }
      
      log(`加载了${loadedCount}个缓存项`, 'info');
    } catch (error) {
      log(`加载缓存失败: ${error}`, 'error');
      this.cacheItems.clear();
    }
  }
  
  /**
   * 保存缓存项到磁盘
   * @param cacheItem 缓存项
   */
  private saveCacheItem(cacheItem: CacheItem): void {
    try {
      const filePath = path.join(this.cacheDir, `${cacheItem.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(cacheItem), 'utf8');
    } catch (error) {
      log(`保存缓存项失败: ${cacheItem.id}, ${error}`, 'error');
    }
  }
  
  /**
   * 限制缓存数量
   */
  private trimCache(): void {
    if (this.cacheItems.size <= this.maxCacheItems) {
      return;
    }
    
    // 将缓存项按时间排序
    const items = Array.from(this.cacheItems.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // 保留最近的N个，删除多余的
    const itemsToRemove = items.slice(this.maxCacheItems);
    
    // 清理多余的缓存
    for (const item of itemsToRemove) {
      this.cacheItems.delete(item.id);
      
      // 删除文件
      try {
        const filePath = path.join(this.cacheDir, `${item.id}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // 忽略删除失败
      }
    }
    
    log(`清理了${itemsToRemove.length}个缓存项`, 'info');
  }
} 