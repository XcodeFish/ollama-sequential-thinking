import * as vscode from 'vscode';
import { OllamaClient } from '../../api/client';
import { log } from '../../utils/logger';
import { SequentialThinkingRequest } from '../../api/types';
import { InferenceEngine, InferenceRequest, InferenceResult } from './types';

/**
 * 思考步骤
 */
export interface ThinkingStep {
  /** 步骤标题 */
  title: string;
  /** 步骤内容 */
  content: string;
  /** 步骤时间戳 */
  timestamp: number;
}

/**
 * 思考结果
 */
export interface ThinkingResult {
  /** 思考步骤列表 */
  steps: ThinkingStep[];
  /** 最终结果 */
  result: string;
  /** 用户问题 */
  question: string;
  /** 处理时长(ms) */
  processTime: number;
  /** 使用的模型 */
  model: string;
}

/**
 * 思考阶段
 */
export enum ThinkingStage {
  UNDERSTAND = '理解问题',
  ANALYZE = '分析代码',
  APPROACH = '思考方法',
  SOLUTION = '提出解决方案',
  VERIFY = '验证方案',
  FINALIZE = '总结回答'
}

/**
 * Sequential-thinking引擎
 * 实现基于大模型的逐步思考
 */
export class SequentialThinkingEngine {
  private client: OllamaClient;

  /**
   * 构造函数
   * @param client Ollama API客户端
   */
  constructor(client: OllamaClient) {
    this.client = client;
    log('Sequential-thinking引擎初始化', 'info');
  }

  /**
   * 处理用户问题
   * @param question 用户问题
   * @param codeContext 代码上下文
   * @param options 选项
   * @returns 思考结果
   */
  public async process(
    question: string, 
    codeContext: string = '',
    options?: Partial<SequentialThinkingRequest>
  ): Promise<ThinkingResult> {
    const startTime = Date.now();
    log(`开始处理问题: ${question}`, 'info');

    // 构建请求
    const request: SequentialThinkingRequest = {
      question,
      codeContext,
      steps: options?.steps || 5,
      options: options?.options
    };

    try {
      // 创建提示词
      const prompt = this.buildPrompt(request);
      
      // 调用模型
      const response = await this.client.generate({
        prompt,
        model: request.options?.model,
        options: {
        temperature: request.options?.temperature || 0.7
        }
      });

      // 解析响应
      const result = this.parseResponse(response);
      result.question = question;
      result.processTime = Date.now() - startTime;
      result.model = request.options?.model || this.client.getDefaultModel();

      log(`问题处理完成，耗时: ${result.processTime}ms`, 'info');
      return result;
    } catch (error) {
      log(`问题处理失败: ${error}`, 'error');
      throw new Error(`思考引擎处理失败: ${error}`);
    }
  }

  /**
   * 流式处理用户问题
   * @param question 用户问题
   * @param codeContext 代码上下文
   * @param callback 回调函数，用于流式返回思考步骤
   * @param options 选项
   */
  public async streamProcess(
    question: string,
    codeContext: string = '',
    callback: (
      stage: ThinkingStage, 
      content: string, 
      isComplete: boolean, 
      stepIndex: number
    ) => void,
    options?: Partial<SequentialThinkingRequest>
  ): Promise<ThinkingResult> {
    const startTime = Date.now();
    log(`开始流式处理问题: ${question}`, 'info');

    // 构建请求
    const request: SequentialThinkingRequest = {
      question,
      codeContext,
      steps: options?.steps || 5,
      options: {
        ...options?.options,
        stream: true
      }
    };

    try {
      // 创建提示词
      const prompt = this.buildStreamingPrompt(request);
      
      // 初始化结果
      const result: ThinkingResult = {
        question,
        result: '',
        steps: [],
        processTime: 0,
        model: request.options?.model || this.client.getDefaultModel()
      };
      
      // 当前正在处理的阶段
      let currentStage = ThinkingStage.UNDERSTAND;
      let currentStageContent = '';
      let currentStageIndex = 0;
      
      // 确定API端点
      const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
      const apiEndpoint = config.get<string>('apiEndpoint') || 'http://localhost:11434';
      
      // 发送API请求
      const response = await fetch(`${apiEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.options?.model || this.client.getDefaultModel(),
          prompt,
          stream: true,
          options: {
          temperature: request.options?.temperature || 0.7,
          max_tokens: request.options?.max_tokens || 4096
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      // 创建初始步骤
      this.addStepToResult(result, ThinkingStage.UNDERSTAND, '', callback);
      
      // 处理流式响应
      let fullResponse = '';
      let accumulatedText = '';
      
      let isReading = true;
      while (isReading) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            isReading = false;
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.done) {
                continue;
              }
              
              if (data.response) {
                fullResponse += data.response;
                accumulatedText += data.response;
                
                // 检查是否有新的思考阶段标记
                if (this.checkForStageMarker(accumulatedText)) {
                  const { stage, content } = this.extractStageContent(accumulatedText);
                  
                  if (stage && stage !== currentStage) {
                    // 完成当前阶段
                    if (currentStageContent) {
                      this.updateStepContent(
                        result, 
                        currentStageIndex, 
                        currentStageContent, 
                        true, 
                        callback
                      );
                    }
                    
                    // 开始新阶段
                    currentStage = stage;
                    currentStageContent = content;
                    currentStageIndex = this.addStepToResult(
                      result, 
                      currentStage, 
                      content, 
                      callback
                    );
                    
                    // 重置累积文本
                    accumulatedText = '';
                  } else {
                    // 继续当前阶段
                    currentStageContent += data.response;
                    this.updateStepContent(
                      result, 
                      currentStageIndex, 
                      data.response, 
                      false, 
                      callback
                    );
                  }
                } else {
                  // 继续累积当前阶段的文本
                  currentStageContent += data.response;
                  this.updateStepContent(
                    result, 
                    currentStageIndex, 
                    data.response, 
                    false, 
                    callback
                  );
                }
              }
              
              // 检查是否有错误响应
              if (data.error) {
                log(`模型响应错误: ${data.error}`, 'error');
                throw new Error(`模型响应错误: ${data.error}`);
              }
            } catch (e) {
              // 只记录解析错误但继续处理
              if (e instanceof SyntaxError) {
                log(`JSON解析错误: ${e.message}`, 'warning');
              } else {
                throw e; // 重新抛出非解析类错误
              }
            }
          }
        } catch (readError) {
          // 处理读取错误，如果是关键错误则中断循环
          log(`读取流数据错误: ${readError}`, 'error');
          if (readError instanceof TypeError || readError instanceof Error) {
            isReading = false;
            throw readError;
          }
        }
      }
      
      // 完成最后一个阶段
      if (currentStageContent) {
        this.updateStepContent(
          result, 
          currentStageIndex, 
          '', 
          true, 
          callback
        );
      }
      
      // 提取最终答案
      result.result = this.extractFinalAnswer(fullResponse);
      result.processTime = Date.now() - startTime;
      
      log(`流式处理完成，耗时: ${result.processTime}ms`, 'info');
      return result;
    } catch (error) {
      log(`流式处理失败: ${error}`, 'error');
      throw new Error(`思考引擎流式处理失败: ${error}`);
    }
  }

  /**
   * 添加新步骤到结果中
   */
  private addStepToResult(
    result: ThinkingResult,
    stage: ThinkingStage,
    content: string,
    callback: (stage: ThinkingStage, content: string, isComplete: boolean, stepIndex: number) => void
  ): number {
    const step: ThinkingStep = {
      title: stage,
      content,
      timestamp: Date.now()
    };
    
    result.steps.push(step);
    const stepIndex = result.steps.length - 1;
    
    callback(stage, content, false, stepIndex);
    return stepIndex;
  }
  
  /**
   * 更新步骤内容
   */
  private updateStepContent(
    result: ThinkingResult,
    stepIndex: number,
    content: string,
    isComplete: boolean,
    callback: (stage: ThinkingStage, content: string, isComplete: boolean, stepIndex: number) => void
  ): void {
    if (stepIndex >= 0 && stepIndex < result.steps.length) {
      const step = result.steps[stepIndex];
      if (content) {
        step.content += content;
      }
      callback(step.title as ThinkingStage, content, isComplete, stepIndex);
    }
  }

  /**
   * 检查文本中是否包含阶段标记
   */
  private checkForStageMarker(text: string): boolean {
    const stageMarkers = [
      '## 理解问题',
      '## 分析代码',
      '## 思考方法',
      '## 提出解决方案',
      '## 验证方案',
      '## 总结回答'
    ];
    
    return stageMarkers.some(marker => text.includes(marker));
  }
  
  /**
   * 从文本中提取阶段和内容
   */
  private extractStageContent(text: string): { stage: ThinkingStage | null; content: string } {
    const stageMap: Record<string, ThinkingStage> = {
      '## 理解问题': ThinkingStage.UNDERSTAND,
      '## 分析代码': ThinkingStage.ANALYZE,
      '## 思考方法': ThinkingStage.APPROACH,
      '## 提出解决方案': ThinkingStage.SOLUTION,
      '## 验证方案': ThinkingStage.VERIFY,
      '## 总结回答': ThinkingStage.FINALIZE
    };
    
    for (const [marker, stage] of Object.entries(stageMap)) {
      if (text.includes(marker)) {
        const startIndex = text.indexOf(marker) + marker.length;
        const content = text.substring(startIndex).trim();
        return { stage, content };
      }
    }
    
    return { stage: null, content: text };
  }
  
  /**
   * 从完整响应中提取最终答案
   */
  private extractFinalAnswer(text: string): string {
    const answerMarker = '## 总结回答';
    if (text.includes(answerMarker)) {
      const startIndex = text.indexOf(answerMarker) + answerMarker.length;
      return text.substring(startIndex).trim();
    }
    
    return text;
  }

  /**
   * 构建提示词
   * @param request 请求
   * @returns 提示词
   */
  private buildPrompt(request: SequentialThinkingRequest): string {
    return `
你是一个先进的AI编程助手，使用逐步思考方法解决问题。

问题: ${request.question}

${request.codeContext ? `代码上下文:\n\`\`\`\n${request.codeContext}\n\`\`\`` : ''}

请按照以下步骤思考:
1. 理解问题：透彻理解用户问题，明确目标
2. 分析代码上下文：分析提供的代码，理解其结构和功能
3. 思考方法：考虑不同的解决方案，权衡优缺点
4. 提出解决方案：详细描述最佳解决方案，提供必要的代码示例
5. 验证方案：检查解决方案是否满足需求，验证其正确性
6. 总结回答：简洁明了地总结最终答案

对每个步骤进行清晰的思考，并用序号标记每个步骤。最后给出完整的解决方案。
`;
  }

  /**
   * 构建用于流式思考的提示词
   * @param request 请求
   * @returns 提示词
   */
  private buildStreamingPrompt(request: SequentialThinkingRequest): string {
    return `
你是一个先进的AI编程助手，使用逐步思考方法解决问题。

问题: ${request.question}

${request.codeContext ? `代码上下文:\n\`\`\`\n${request.codeContext}\n\`\`\`` : ''}

请使用以下确切的思考结构，每个部分必须使用指定的标题标记（例如"## 理解问题"）：

## 理解问题
在这一步，透彻分析用户的问题，识别关键需求、约束条件和期望的结果。明确问题的范围和目标。

## 分析代码
分析提供的代码上下文，理解其结构、功能、模式和限制。识别可能与问题相关的代码部分。

## 思考方法
考虑多种可能的解决方案。分析每种方法的优缺点、适用性和潜在问题。进行权衡分析。

## 提出解决方案
详细描述最佳解决方案。提供必要的代码示例，确保代码完整、准确，遵循最佳实践。
如果需要展示代码，请使用 \`\`\` 代码块格式。

## 验证方案
检查解决方案是否满足需求，验证其正确性和完整性。考虑边缘情况和可能的问题。

## 总结回答
简洁明了地总结最终答案，直接回答用户问题，不要重复前面的分析过程。
如果有代码解决方案，确保在这里给出最终的、完整的代码。
`;
  }

  /**
   * 解析模型响应
   * @param response 模型响应文本
   * @returns 解析后的思考结果
   */
  private parseResponse(response: string): ThinkingResult {
    const steps: ThinkingStep[] = [];
    
    // 检查是否包含标准的markdown标记
    const stageMarkers = [
      '## 理解问题',
      '## 分析代码',
      '## 思考方法',
      '## 提出解决方案',
      '## 验证方案',
      '## 总结回答'
    ];
    
    // 尝试提取标准格式的步骤
    let lastIndex = 0;
    let currentTitle = '';
    
    for (let i = 0; i < stageMarkers.length; i++) {
      const marker = stageMarkers[i];
      const index = response.indexOf(marker, lastIndex);
      
      if (index !== -1) {
        // 保存上一个步骤的内容
        if (currentTitle && lastIndex > 0) {
          const content = response.substring(lastIndex, index).trim();
          steps.push({
            title: currentTitle,
            content,
            timestamp: Date.now() - (stageMarkers.length - i) * 1000 // 添加伪时间戳
          });
        }
        
        currentTitle = marker.replace('## ', '');
        lastIndex = index + marker.length;
        
        // 如果是最后一个标记，添加到结尾的内容
        if (i === stageMarkers.length - 1) {
          const content = response.substring(lastIndex).trim();
          steps.push({
            title: currentTitle,
            content,
            timestamp: Date.now()
          });
        }
      }
    }
    
    // 如果没有找到标准格式，使用简单的分段逻辑
    if (steps.length === 0) {
      const lines = response.split('\n');
      let currentTitle = '';
      let currentContent = '';
      
      for (const line of lines) {
        if (line.match(/^\d+\.\s+/) || line.match(/^#+\s+/)) {
          // 遇到新步骤，保存上一步骤
          if (currentTitle) {
            steps.push({
              title: currentTitle,
              content: currentContent.trim(),
              timestamp: Date.now()
            });
          }
          currentTitle = line.trim().replace(/^\d+\.\s+/, '').replace(/^#+\s+/, '');
          currentContent = '';
        } else {
          currentContent += line + '\n';
        }
      }
      
      // 添加最后一个步骤
      if (currentTitle) {
        steps.push({
          title: currentTitle,
          content: currentContent.trim(),
          timestamp: Date.now()
        });
      }
    }
    
    // 如果还是没有步骤，将整个响应作为单个步骤
    if (steps.length === 0) {
      steps.push({
        title: '思考结果',
        content: response.trim(),
        timestamp: Date.now()
      });
    }

    return {
      steps,
      result: this.extractFinalAnswer(response),
      question: '',
      processTime: 0,
      model: ''
    };
  }
}

/**
 * Ollama推理引擎
 * 负责处理文本生成请求
 */
export class OllamaInferenceEngine implements InferenceEngine {
  private client: OllamaClient;
  
  /**
   * 构造函数
   * @param client Ollama客户端
   */
  constructor(client: OllamaClient) {
    this.client = client;
  }
  
  /**
   * 执行推理
   * @param request 推理请求
   * @returns 推理结果Promise
   */
  public async infer(request: InferenceRequest): Promise<InferenceResult> {
    try {
      // 验证请求
      if (!request.prompt) {
        throw new Error('请求缺少必要的prompt字段');
      }
      
      // 记录请求开始
      const startTime = Date.now();
      log(`开始推理请求: ${request.id || '未指定ID'}`, 'info');
      
      // 执行推理
      const result = await this._executeInference(request);
      
      // 记录完成时间
      const endTime = Date.now();
      const duration = endTime - startTime;
      log(`推理完成，耗时: ${duration}ms`, 'info');
      
      return result;
    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`推理过程中发生错误: ${errorMessage}`, 'error');
      
      // 构造错误结果
      return {
        success: false,
        error: errorMessage,
        text: '',
        duration: 0
      };
    }
  }
  
  /**
   * 获取引擎类型
   * @returns 引擎类型字符串
   */
  public getType(): string {
    return 'ollama';
  }
  
  /**
   * 获取引擎状态
   * @returns 引擎状态对象
   */
  public async getStatus(): Promise<{available: boolean; info?: string}> {
    try {
      const isAvailable = await this.client.ping();
      return {
        available: isAvailable,
        info: isAvailable ? 'Ollama服务可用' : 'Ollama服务不可用'
      };
    } catch (error) {
      return {
        available: false,
        info: `Ollama服务检查失败: ${error}`
      };
    }
  }
  
  /**
   * 执行推理请求
   * @param request 推理请求
   * @returns 推理结果
   */
  private async _executeInference(request: InferenceRequest): Promise<InferenceResult> {
    try {
      // 记录请求信息
      log(`执行推理请求: ${request.options?.sequential ? 'Sequential' : 'Standard'}`, 'info');
      
      const startTime = Date.now();
      
      // 调用API生成文本
      const response = await this.client.generate({
        prompt: request.prompt,
        model: request.options?.model,
        stream: request.options?.stream || false,
        options: {
          temperature: request.options?.temperature || 0.7,
          num_predict: request.options?.maxTokens,
          top_p: request.options?.topP,
          top_k: request.options?.topK
        }
      });
      
      // 计算耗时
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 返回结果
      return {
        success: true,
        text: response,
        duration: duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`执行推理请求失败: ${errorMessage}`, 'error');
      throw error;
    }
  }
} 