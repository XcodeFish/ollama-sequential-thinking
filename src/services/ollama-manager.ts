import * as vscode from 'vscode';
import { OllamaClient } from '../api/client';
import { ModelInfo } from '../api/types';
import { log } from '../utils/logger';

/**
 * Ollama管理器类
 * 提供与Ollama服务的交互能力
 */
export class OllamaManager {
  private static instance: OllamaManager;
  private client: OllamaClient;
  private isInitialized: boolean = false;
  private defaultModel: string = 'deepseek-coder:1.3b';

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    // 获取API端点配置
    const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
    const apiEndpoint = config.get<string>('apiEndpoint') || 'http://localhost:11434';

    // 创建API客户端
    this.client = new OllamaClient(apiEndpoint);

    // 获取默认模型
    this.defaultModel = config.get<string>('defaultModel') || 'deepseek-coder:1.3b';

    // 监听配置变更
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ollama-sequential-thinking.apiEndpoint')) {
        const newEndpoint = vscode.workspace.getConfiguration('ollama-sequential-thinking').get<string>('apiEndpoint');
        if (newEndpoint) {
          this.updateEndpoint(newEndpoint);
        }
      }

      if (e.affectsConfiguration('ollama-sequential-thinking.defaultModel')) {
        this.defaultModel = vscode.workspace.getConfiguration('ollama-sequential-thinking').get<string>('defaultModel') || 'deepseek-coder:1.3b';
        log(`默认模型已更新: ${this.defaultModel}`, 'info');
      }
    });
  }

  /**
   * 获取单例实例
   * @returns OllamaManager实例
   */
  public static getInstance(): OllamaManager {
    if (!OllamaManager.instance) {
      OllamaManager.instance = new OllamaManager();
    }
    return OllamaManager.instance;
  }

  /**
   * 初始化Manager
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      log('正在连接Ollama服务...', 'info');

      // 尝试连接Ollama服务
      const isAvailable = await this.client.ping();

      if (isAvailable) {
        log('Ollama服务连接成功', 'info');
        this.isInitialized = true;

        // 尝试获取模型列表
        try {
          const models = await this.client.listModels();
          log(`已加载${models.length}个模型`, 'info');

          // 如果有模型，且当前默认模型不在列表中，则选择第一个作为默认
          if (models.length > 0) {
            const modelNames = models.map(m => m.name || (typeof m === 'string' ? m : ''));

            if (!modelNames.includes(this.defaultModel)) {
              // 取第一个有效的模型名称
              for (const model of models) {
                const modelName = model.name || (typeof model === 'string' ? model : '');
                if (modelName) {
                  this.defaultModel = modelName;
                  this.client.setDefaultModel(this.defaultModel);

                  // 更新配置
                  await vscode.workspace.getConfiguration('ollama-sequential-thinking').update('defaultModel', this.defaultModel, true);
                  log(`默认模型已设置为: ${this.defaultModel}`, 'info');
                  break;
                }
              }
            }
          } else {
            log('没有找到可用的模型', 'warning');
          }
        } catch (error) {
          log(`获取模型列表失败: ${error}`, 'warning');
        }
      } else {
        log('Ollama服务连接失败，请确保服务已启动', 'error');
      }
    } catch (error) {
      this.isInitialized = false;
      log(`初始化Ollama管理器失败: ${error}`, 'error');
    }
  }

  /**
   * 更新API端点
   * @param endpoint 新的端点URL
   */
  public updateEndpoint(endpoint: string): void {
    this.client.updateEndpoint(endpoint);
    log(`API端点已更新: ${endpoint}`, 'info');
  }

  /**
   * 获取客户端实例
   * @returns OllamaClient实例
   */
  public getClient(): OllamaClient {
    return this.client;
  }

  /**
   * 获取可用模型列表
   * @returns 模型列表
   */
  public async getModels(): Promise<ModelInfo[]> {
    if (!this.client) {
      return [];
    }

    try {
      return await this.client.listModels();
    } catch (error) {
      log(`获取模型列表失败: ${error}`, 'error');
      return [];
    }
  }

  /**
   * 获取默认模型
   * @returns 默认模型名称
   */
  public getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * 设置默认模型
   * @param model 模型名称
   */
  public async setDefaultModel(model: string): Promise<void> {
    if (model === this.defaultModel) {
      return;
    }

    this.defaultModel = model;

    // 更新配置
    await vscode.workspace.getConfiguration('ollama-sequential-thinking').update('defaultModel', model, true);
    log(`默认模型已设置为: ${model}`, 'info');
  }

  /**
   * 检查是否已初始化
   * @returns 初始化状态
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}