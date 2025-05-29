/**
 * Ollama请求选项
 */
export interface OllamaRequestOptions {
  /** 模型名称 */
  model: string;
  /** 提示词 */
  prompt: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 温度参数 (0.0-1.0) */
  temperature?: number;
  /** Top-p采样参数 */
  top_p?: number;
  /** Top-k采样参数 */
  top_k?: number;
  /** 最大生成token数 */
  max_tokens?: number;
}

/**
 * Ollama响应
 */
export interface OllamaResponse {
  /** 使用的模型 */
  model: string;
  /** 生成的响应文本 */
  response: string;
  /** 是否已完成生成 */
  done: boolean;
  /** 上下文token序列 */
  context?: number[];
}

/**
 * Ollama流式响应
 */
export interface OllamaStreamResponse extends OllamaResponse {
  /** 当前输出片段 */
  content: string;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  /** 模型名称 */
  name: string;
  /** 模型大小 */
  size?: number;
  /** 模型修改时间 */
  modified?: number;
  /** 模型相关参数 */
  details?: any;
}

/**
 * 模型列表响应
 */
export interface ModelListResponse {
  /** 模型列表 */
  models: ModelInfo[];
}

/**
 * Sequential Thinking请求选项
 */
export interface SequentialThinkingOptions {
  /** 模型名称 */
  model?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大生成token数量 */
  max_tokens?: number;
  /** 是否使用流式输出 */
  stream?: boolean;
  /** 其他选项 */
  [key: string]: any;
}

/**
 * Sequential Thinking请求
 */
export interface SequentialThinkingRequest {
  /** 用户问题 */
  question: string;
  /** 代码上下文 */
  codeContext: string;
  /** 思考步骤数量 */
  steps: number;
  /** 请求选项 */
  options?: SequentialThinkingOptions;
} 