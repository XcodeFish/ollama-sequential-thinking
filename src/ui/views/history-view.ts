import * as vscode from 'vscode';
import { HistoryItem, HistoryManager } from '../../core/history';
import { ResultPanel } from '../panels/result-panel';
import { log } from '../../utils/logger';

/**
 * 历史记录项目
 */
class HistoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly historyItem: HistoryItem,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(historyItem.question, collapsibleState);
    
    // 设置图标
    this.iconPath = new vscode.ThemeIcon('history');
    
    // 设置工具提示
    this.tooltip = `${historyItem.question}\n\n${historyItem.summary}`;
    
    // 设置描述
    this.description = new Date(historyItem.timestamp).toLocaleString();
    
    // 设置上下文值，用于菜单项
    this.contextValue = 'historyItem';
    
    // 设置命令
    this.command = {
      command: 'ollama-sequential-thinking.openHistoryItem',
      title: '打开历史记录',
      arguments: [historyItem.id]
    };
  }
}

/**
 * 历史记录数据提供者
 * 为树视图提供历史记录数据
 */
export class HistoryTreeDataProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HistoryTreeItem | undefined | null | void> = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<HistoryTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  /**
   * 构造函数
   * @param historyManager 历史记录管理器
   */
  constructor(private historyManager: HistoryManager) {}
  
  /**
   * 刷新树视图
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  /**
   * 获取树项
   * @param element 元素
   * @returns 树项
   */
  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element;
  }
  
  /**
   * 获取子元素
   * @param element 元素
   * @returns 子元素
   */
  getChildren(element?: HistoryTreeItem): Thenable<HistoryTreeItem[]> {
    if (element) {
      // 历史记录项没有子项
      return Promise.resolve([]);
    } else {
      // 获取所有历史记录
      const historyItems = this.historyManager.getHistory();
      
      // 转换为树项
      return Promise.resolve(
        historyItems.map(item => new HistoryTreeItem(item, vscode.TreeItemCollapsibleState.None))
      );
    }
  }
}

/**
 * 注册历史记录视图和相关命令
 * @param context 扩展上下文
 * @param historyManager 历史记录管理器
 */
export function registerHistoryView(context: vscode.ExtensionContext, historyManager: HistoryManager): void {
  // 创建历史记录数据提供者
  const historyTreeDataProvider = new HistoryTreeDataProvider(historyManager);
  
  // 注册树视图
  const treeView = vscode.window.createTreeView('ollama-sequential-thinking.historyView', {
    treeDataProvider: historyTreeDataProvider,
    showCollapseAll: true
  });
  
  // 注册打开历史记录命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama-sequential-thinking.openHistoryItem', async (id: string) => {
      try {
        const item = historyManager.getHistoryItem(id);
        if (item) {
          ResultPanel.createOrShow(context.extensionUri, item.result);
        }
      } catch (error) {
        log(`打开历史记录失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`打开历史记录失败: ${error}`);
      }
    })
  );
  
  // 注册删除历史记录命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama-sequential-thinking.deleteHistoryItem', async (item: HistoryTreeItem) => {
      try {
        const result = await vscode.window.showWarningMessage(
          '确定要删除这条历史记录吗？',
          { modal: true },
          '删除'
        );
        
        if (result === '删除') {
          historyManager.deleteHistoryItem(item.historyItem.id);
          historyTreeDataProvider.refresh();
        }
      } catch (error) {
        log(`删除历史记录失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`删除历史记录失败: ${error}`);
      }
    })
  );
  
  // 注册清空历史记录命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama-sequential-thinking.clearHistory', async () => {
      try {
        const result = await vscode.window.showWarningMessage(
          '确定要清空所有历史记录吗？此操作不可撤销！',
          { modal: true },
          '清空'
        );
        
        if (result === '清空') {
          historyManager.clearHistory();
          historyTreeDataProvider.refresh();
        }
      } catch (error) {
        log(`清空历史记录失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`清空历史记录失败: ${error}`);
      }
    })
  );
  
  // 将树视图添加到订阅
  context.subscriptions.push(treeView);
  
  log('历史记录视图已注册', 'info');
} 