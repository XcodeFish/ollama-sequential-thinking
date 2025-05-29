import * as vscode from 'vscode';

// 创建输出通道
const outputChannel = vscode.window.createOutputChannel('Ollama Sequential Thinking');

/**
 * 日志工具函数
 * @param message 日志消息
 * @param level 日志级别
 */
export function log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

  if (level === 'error') {
    outputChannel.show();
  }
}

/**
 * 清除日志
 */
export function clearLog(): void {
  outputChannel.clear();
}

/**
 * 显示日志窗口
 */
export function showLog(): void {
  outputChannel.show();
} 