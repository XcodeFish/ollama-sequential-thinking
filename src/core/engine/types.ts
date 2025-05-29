/**
 * 推理请求选项
 */
export interface InferenceOptions {
  /** 模型名称 */
  model?: string;
  /** 是否使用流式输出 */
  stream?: boolean;
  /** 温度参数 */
  temperature?: number;
  /** 最大生成token数量 */
  maxTokens?: number;
  /** 是否使用Sequential Thinking */
  sequential?: boolean;
  /** Top-P取样参数 */
  topP?: number;
  /** Top-K取样参数 */
  topK?: number;
}

/**
 * 推理请求
 */
export interface InferenceRequest {
  /** 请求ID */
  id?: string;
  /** 提示文本 */
  prompt: string;
  /** 选项 */
  options?: InferenceOptions;
}

/**
 * 推理结果
 */
export interface InferenceResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的文本 */
  text: string;
  /** 执行时间(毫秒) */
  duration: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 推理引擎接口
 */
export interface InferenceEngine {
  /**
   * 执行推理
   * @param request 推理请求
   */
  infer(request: InferenceRequest): Promise<InferenceResult>;
  
  /**
   * 获取引擎类型
   */
  getType(): string;
  
  /**
   * 获取引擎状态
   */
  getStatus(): Promise<{available: boolean; info?: string}>;
} 