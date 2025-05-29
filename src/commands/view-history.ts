import * as vscode from 'vscode';
import { HistoryManager } from '../core/history';
import { HistoryPanel } from '../ui/panels/history-panel';
import { log } from '../utils/logger';

/**
 * 查看历史记录命令
 * @param context 扩展上下文
 */
export async function viewHistory(context: vscode.ExtensionContext): Promise<void> {
  try {
    // 获取历史记录管理器
    const historyManager = HistoryManager.getInstance(context);
    
    // 显示历史记录面板
    HistoryPanel.createOrShow(context.extensionUri, historyManager);
    
    log('打开历史记录面板', 'info');
  } catch (error) {
    log(`打开历史记录面板失败: ${error}`, 'error');
    vscode.window.showErrorMessage(`打开历史记录失败: ${error}`);
  }
} 