import * as vscode from 'vscode';
import { OllamaClient } from '../../api/client';
import { ModelInfo } from '../../api/types';
import { log } from '../../utils/logger';
import { WebviewUtils } from '../webview';

/**
 * 模型管理视图
 * 提供Ollama模型的列表、详情和管理功能
 */
export class ModelsView implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ollama-sequential-thinking.modelsView';
  
  private _view?: vscode.WebviewView;
  private _client: OllamaClient;
  private _models: ModelInfo[] = [];
  
  /**
   * 构造函数
   * @param extensionUri 扩展URI
   * @param client Ollama客户端
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    client: OllamaClient
  ) {
    this._client = client;
  }
  
  /**
   * 解析WebView
   * @param webviewView WebView视图
   * @param _context 上下文
   * @param _token 取消令牌
   */
  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this._view = webviewView;
    
    log(`正在解析模型视图: ${webviewView.title}`, 'info');
    
    // 配置WebView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    // 使用WebviewUtils加载HTML文件
    webviewView.webview.html = WebviewUtils.getWebviewContent(
      this._extensionUri,
      webviewView.webview,
      'resources/webview/models-view.html'
    );
    
    // 添加明确的日志
    log('模型视图WebView已初始化，正在加载模型列表', 'info');
    
    try {
      // 加载模型
      this._models = await this._client.listModels();
      
      // 更新视图
      if (this._view) {
        this._updateModelsList();
      }
      
      log(`模型加载完成，加载了${this._models.length}个模型`, 'info');
    } catch (error) {
      log(`加载模型列表失败: ${error}`, 'error');
      if (this._view) {
        this._view.webview.postMessage({
          type: 'error',
          error: `加载模型失败: ${error}`
        });
      }
    }
    
    // 处理消息
    webviewView.webview.onDidReceiveMessage(async message => {
      try {
        log(`收到模型视图消息: ${JSON.stringify(message)}`, 'info');
        switch (message.type) {
          case 'get-models':
            await this._refreshModels();
            break;
          case 'use-model':
            await this._setDefaultModel(message.model);
            break;
          case 'webview-loaded':
            log(`模型视图WebView加载成功: ${message.path}`, 'info');
            // 重新发送模型数据
            this._updateModelsList();
            break;
          case 'test':
            log(`收到测试消息: ${message.message}`, 'info');
            // 回复测试消息
            if (this._view) {
              this._view.webview.postMessage({
                type: 'test-response',
                message: '服务器收到测试消息'
              });
            }
            break;
        }
    } catch (error) {
        log(`处理模型视图消息失败: ${error}`, 'error');
        if (this._view) {
          this._view.webview.postMessage({
            type: 'error',
            error: `操作失败: ${error}`
          });
        }
      }
    });
  }
  
  /**
   * 更新模型列表
   */
  private _updateModelsList(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'models',
        models: this._models,
        currentModel: this._client.getDefaultModel()
      });
      log('已向WebView发送模型数据', 'info');
    }
  }
  
  /**
   * 刷新模型列表
   */
  private async _refreshModels(): Promise<void> {
    try {
      this._models = await this._client.listModels();
      this._updateModelsList();
      log(`模型列表已刷新，共${this._models.length}个模型`, 'info');
    } catch (error) {
      log(`刷新模型列表失败: ${error}`, 'error');
      throw error;
    }
  }
  
  /**
   * 设置默认模型
   * @param modelName 模型名称
   */
  private async _setDefaultModel(modelName: string): Promise<void> {
    try {
      await this._client.setDefaultModel(modelName);
      this._updateModelsList(); // 更新UI以反映新的默认模型
      vscode.window.showInformationMessage(`已设置默认模型: ${modelName}`);
      log(`已将默认模型设置为: ${modelName}`, 'info');
    } catch (error) {
      log(`设置默认模型失败: ${error}`, 'error');
      throw error;
    }
  }
} 