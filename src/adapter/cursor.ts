import * as vscode from 'vscode';
import { IEditorAdapter } from './index';
import { OllamaManager } from '../services';
import { OllamaClient } from '../api/client';

/**
 * Cursor编辑器适配器
 * 由于Cursor基于VSCode，大部分行为与VSCode相同
 * 但可能会有一些特定的差异需要处理
 */
export class CursorAdapter implements IEditorAdapter {
  private context: vscode.ExtensionContext;
  private ollamaManager: OllamaManager;

  constructor(context: vscode.ExtensionContext, ollamaManager: OllamaManager) {
    this.context = context;
    this.ollamaManager = ollamaManager;
  }

  /**
   * 获取当前编辑器内容
   */
  public getActiveEditorContent(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }
    return editor.document.getText();
  }

  /**
   * 在编辑器中插入文本
   * @param text 要插入的文本
   */
  public async insertText(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    return editor.edit((editBuilder) => {
      const position = editor.selection.active;
      editBuilder.insert(position, text);
    });
  }

  /**
   * 显示消息
   * @param message 消息内容
   * @param type 消息类型
   */
  public showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    switch (type) {
      case 'info':
        vscode.window.showInformationMessage(message);
        break;
      case 'warning':
        vscode.window.showWarningMessage(message);
        break;
      case 'error':
        vscode.window.showErrorMessage(message);
        break;
      default:
        vscode.window.showInformationMessage(message);
    }
  }

  /**
   * 获取Ollama客户端
   * @returns Ollama客户端实例
   */
  public getOllamaClient(): OllamaClient {
    return this.ollamaManager.getClient();
  }

  // 这里可以添加Cursor特有的功能扩展
} 