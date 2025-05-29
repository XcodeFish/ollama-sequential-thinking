import * as https from 'https';
import * as http from 'http';
import * as vscode from 'vscode';
import { ModelInfo } from './types';
import { log } from '../utils/logger';

/**
 * Ollama API客户端类
 */
export class OllamaClient {
  private apiEndpoint: string;
  private defaultModel: string;

  /**
   * 构造函数
   * @param apiEndpoint Ollama API端点
   * @param defaultModel 默认模型
   */
  constructor(
    apiEndpoint: string = 'http://localhost:11434',
    defaultModel: string = 'deepseek-coder:1.3b'
  ) {
    this.apiEndpoint = apiEndpoint;
    this.defaultModel = defaultModel;

    log(`Ollama客户端初始化: ${this.apiEndpoint}`, 'info');
  }

  /**
   * 更新API端点
   * @param endpoint 新的端点URL
   */
  public updateEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }

  /**
   * 检查Ollama服务连接
   * @returns 是否连接成功
   */
  public async ping(): Promise<boolean> {
    // 尝试多个可能的API路径
    const paths = [
      '/api/tags',
      '/api/version',
      '/api'
    ];

    for (const path of paths) {
      try {
        const response = await this.makeRequest(path, 'GET');
        log(`成功连接到Ollama API: ${path}`, 'info');
        return true;
      } catch (error) {
        log(`尝试连接到${path}失败: ${error instanceof Error ? error.message : String(error)}`, 'warning');
      }
    }

    log('所有Ollama API连接尝试都失败了', 'error');
    return false;
  }

  /**
   * 生成文本
   * @param options 生成选项
   * @returns 生成的文本
   */
  public async generate(options: {
    prompt: string;
    model?: string;
    stream?: boolean;
    context?: number[];
    options?: {
      temperature?: number;
      num_predict?: number;
      top_p?: number;
      top_k?: number;
      [key: string]: any;
    };
  }): Promise<string> {
    try {
      // 构建请求数据
      const data = {
        model: options.model || this.defaultModel,
        prompt: options.prompt,
        stream: true,
        context: options.context || [],
        options: options.options || {}
      };

      // 记录请求信息（不记录具体提示，可能包含敏感信息）
      log(`生成请求: 模型=${data.model}, 流式输出=${data.stream}`, 'info');

      // 发送请求
      const response = await this.makeRequest('/api/generate', 'POST', data);

      if (response && response.response) {
        return response.response;
      } else {
        throw new Error('API返回结果不包含response字段');
      }
    } catch (error) {
      log(`生成请求失败: ${error}`, 'error');
      throw new Error(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取模型列表
   * @returns 模型列表
   */
  public async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('/api/tags', 'GET');

      if (response && response.models) {
        return response.models;
      } else if (response && Array.isArray(response)) {
        return response;
      } else {
        log('获取模型列表返回格式异常', 'warning');
        return [];
      }
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
  public setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * 发送HTTP请求
   * @param path 请求路径
   * @param method 请求方法
   * @param data 请求数据
   * @returns 响应数据
   */
  private async makeRequest(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // 修复URL路径构建
        const baseUrl = this.apiEndpoint.endsWith('/') ? this.apiEndpoint : `${this.apiEndpoint}/`;
        const fullPath = path.startsWith('/') ? path.substring(1) : path;
        const url = new URL(fullPath, baseUrl);

        const isHttps = url.protocol === 'https:';

        // 设置请求选项
        const options: http.RequestOptions = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: method,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        // 创建请求
        const req = (isHttps ? https : http).request(options, (res) => {
          let responseData = '';

          // 接收数据
          res.on('data', (chunk) => {
            responseData += chunk;
          });

          // 处理响应完成
          res.on('end', () => {
            try {
              // 检查状态码
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                // 成功响应
                let parsedData;
                try {
                  parsedData = responseData ? JSON.parse(responseData) : {};
                } catch (e) {
                  parsedData = { response: responseData };
                }
                resolve(parsedData);
              } else {
                // 错误响应
                reject(new Error(`HTTP错误: ${res.statusCode} ${res.statusMessage || ''}`));
              }
            } catch (error) {
              reject(error);
            }
          });
        });

        // 处理请求错误
        req.on('error', (error) => {
          reject(error);
        });

        // 发送请求数据
        if (data && (method === 'POST' || method === 'PUT')) {
          req.write(JSON.stringify(data));
        }

        // 结束请求
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}