import * as vscode from 'vscode';
import { OllamaManager } from '../services';
import { ModelInfo } from '../api/types';
import { log } from '../utils/logger';

/**
 * 模型快速选择项
 */
interface ModelQuickPickItem extends vscode.QuickPickItem {
  model: ModelInfo;
}

/**
 * 选择模型命令
 * 让用户通过界面选择要使用的Ollama模型
 */
export async function selectModel(): Promise<void> {
  log('执行选择模型命令', 'info');

  try {
    // 获取Ollama管理器
    const ollamaManager = OllamaManager.getInstance();
    
    // 显示加载中提示
    const loadingMessage = vscode.window.setStatusBarMessage('$(loading~spin) 正在获取模型列表...');
    
    // 获取模型列表
    const models = await ollamaManager.getModels();
    
    // 释放加载中提示
    loadingMessage.dispose();
    
    if (!models || models.length === 0) {
      vscode.window.showErrorMessage('未找到可用的Ollama模型，请确保本地Ollama服务正常运行且已安装模型');
      return;
    }

    // 创建QuickPick项
    const currentModel = ollamaManager.getDefaultModel();
    const quickPickItems: ModelQuickPickItem[] = models.map(model => ({
      label: model.name,
      description: model.size ? `大小: ${model.size}` : undefined,
      detail: model.name === currentModel ? '当前选中' : undefined,
      model: model
    }));

    // 创建快捷选择框
    const quickPick = vscode.window.createQuickPick<ModelQuickPickItem>();
    quickPick.title = '选择Ollama模型';
    quickPick.placeholder = '搜索或选择一个模型';
    quickPick.items = quickPickItems;
    
    // 设置当前选中项
    const currentSelected = quickPickItems.find(item => item.model.name === currentModel);
    if (currentSelected) {
      quickPick.activeItems = [currentSelected];
    }
    
    // 监听选择事件
    quickPick.onDidAccept(async () => {
      const selection = quickPick.selectedItems[0];
      
      if (selection) {
        // 更新默认模型
        ollamaManager.setDefaultModel(selection.model.name);
        
        // 更新配置
        await vscode.workspace.getConfiguration('ollama-sequential-thinking').update(
          'defaultModel',
          selection.model.name,
          vscode.ConfigurationTarget.Global
        );
        
        vscode.window.showInformationMessage(`已切换到模型: ${selection.model.name}`);
      }
      
      quickPick.hide();
    });
    
    // 显示选择框
    quickPick.show();
  } catch (error) {
    log(`选择模型失败: ${error}`, 'error');
    vscode.window.showErrorMessage(`选择模型失败: ${error}`);
  }
} 