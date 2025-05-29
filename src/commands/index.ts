import { openChatView } from "./openChat";
import * as vscode from 'vscode';
import { log } from '../utils/logger';
import { OllamaManager } from '../services';

/**
 * 注册所有命令
 * @param context 扩展上下文
 * @param adapter 编辑器适配器
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  log('注册命令', 'info');

  // 获取Ollama管理器
  const ollamaManager = OllamaManager.getInstance();

  // 注册命令
  context.subscriptions.push(
    // 提问命令
    vscode.commands.registerCommand('ollama-sequential-thinking.askQuestion', async () => {
      try {
        log('执行提问命令', 'info');

        // 强制设置上下文变量
        await vscode.commands.executeCommand('setContext', 'ollama-plugin-active', true);

        // 打开聊天界面
        await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');

        // 聚焦聊天视图
        await vscode.commands.executeCommand('ollama-sequential-thinking.chatView.focus');
      } catch (error) {
        log(`提问命令执行失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
      }
    }),

    // 生成代码命令
    vscode.commands.registerCommand('ollama-sequential-thinking.generateCode', async () => {
      try {
        log('执行生成代码命令', 'info');

        // 获取当前编辑器内容
        const question = await vscode.window.showInputBox({
          prompt: '请描述你需要生成的代码',
          placeHolder: '例如: 实现一个二分查找算法'
        });

        if (!question) {
          return;
        }

        // 打开聊天界面
        await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');

        // 提示用户已在聊天界面中输入问题
        vscode.window.showInformationMessage('请在聊天界面中查看结果');
      } catch (error) {
        log(`生成代码命令执行失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
      }
    }),

    // 选择模型命令
    vscode.commands.registerCommand('ollama-sequential-thinking.selectModel', async () => {
      try {
        log('执行选择模型命令', 'info');

        // 获取模型列表
        const models = await ollamaManager.getClient().listModels();
        const modelNames = models.map(model => model.name);
        // 显示模型选择
        const selectedModel = await vscode.window.showQuickPick(modelNames, {
          placeHolder: '选择模型',
          title: '选择Ollama模型',
          canPickMany: false
        });

        if (!selectedModel) {
          return;
        }

        // 设置默认模型
        ollamaManager.getClient().setDefaultModel(selectedModel);

        // 更新配置
        const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
        await config.update('defaultModel', selectedModel, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`已将模型切换为: ${selectedModel}`);
        log(`切换默认模型: ${selectedModel}`, 'info');
      } catch (error) {
        log(`选择模型命令执行失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
      }
    }),

    // 查看历史记录命令
    vscode.commands.registerCommand('ollama-sequential-thinking.viewHistory', async () => {
      try {
        log('执行查看历史记录命令', 'info');

        // 打开历史记录视图
        await vscode.commands.executeCommand('workbench.view.explorer');
        await vscode.commands.executeCommand('ollama-sequential-thinking.historyView.focus');
      } catch (error) {
        log(`查看历史记录命令执行失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
      }
    }),

    // 配置模型参数命令
    vscode.commands.registerCommand('ollama-sequential-thinking.configureModelParams', async () => {
      try {
        log('执行配置模型参数命令', 'info');

        // 打开设置
        await vscode.commands.executeCommand('workbench.action.openSettings', 'ollama-sequential-thinking');
      } catch (error) {
        log(`配置模型参数命令执行失败: ${error}`, 'error');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
      }
    }),

    // 打开聊天界面命令
    vscode.commands.registerCommand('ollama-sequential-thinking.openChatView', async () => {
      try {
        log('执行打开聊天界面命令', 'info');
        console.log('=== 开始执行 openChatView 命令 ===');

        // 1. 确保活动栏可见
        console.log('确保活动栏可见...');
        await vscode.commands.executeCommand('workbench.action.focusActivityBar');

        // 2. 强制设置上下文变量
        console.log('设置上下文变量...');
        await vscode.commands.executeCommand('setContext', 'ollama-plugin-active', true);
        console.log('上下文变量设置完成');

        // 3. 强制显示视图容器
        console.log('强制显示视图容器...');
        await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        console.log('视图容器显示命令执行完成');

        // 4. 等待视图容器加载
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. 尝试多种方式聚焦聊天视图
        console.log('尝试聚焦聊天视图...');
        try {
          await vscode.commands.executeCommand('ollama-sequential-thinking.chatView.focus');
          console.log('聊天视图聚焦成功');
        } catch (focusError) {
          console.log('直接聚焦失败，尝试其他方式:', focusError);
          // 再次尝试显示视图容器
          await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        }

        // 6. 显示成功消息
        vscode.window.showInformationMessage('聊天界面已打开！如果没有看到，请检查左侧活动栏中的Ollama图标。');
        console.log('=== openChatView 命令执行完成 ===');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`打开聊天界面命令执行失败: ${errorMessage}`, 'error');
        console.error('openChatView 命令执行失败:', error);

        // 显示详细的错误信息和解决方案
        const result = await vscode.window.showErrorMessage(
          `无法自动打开聊天界面: ${errorMessage}`,
          '手动打开',
          '查看帮助'
        );

        if (result === '手动打开') {
          await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        } else if (result === '查看帮助') {
          vscode.window.showInformationMessage(
            '请手动操作：1. 查看左侧活动栏是否有Ollama图标 2. 点击该图标 3. 在打开的面板中选择"Ollama聊天"'
          );
        }
      }
    }),

    // 测试视图可见性命令
    vscode.commands.registerCommand('ollama-sequential-thinking.testViewVisibility', async () => {
      try {
        console.log('=== 测试视图可见性 ===');

        // 检查视图容器是否可见
        const isVisible = await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        console.log('视图容器打开结果:', isVisible);

        // 尝试直接显示聊天视图
        const chatViewResult = await vscode.commands.executeCommand('vscode.openWith', 'ollama-sequential-thinking.chatView');
        console.log('聊天视图打开结果:', chatViewResult);

        vscode.window.showInformationMessage('视图可见性测试完成，请查看控制台');
      } catch (error) {
        console.error('视图可见性测试失败:', error);
        vscode.window.showErrorMessage(`测试失败: ${error}`);
      }
    }),

    // 强制触发视图解析命令
    vscode.commands.registerCommand('ollama-sequential-thinking.forceResolveView', async () => {
      try {
        console.log('=== 强制触发视图解析 ===');

        // 1. 显示视图容器
        await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        console.log('步骤1: 视图容器显示完成');

        // 2. 等待一下
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. 尝试聚焦聊天视图
        await vscode.commands.executeCommand('ollama-sequential-thinking.chatView.focus');
        console.log('步骤2: 聊天视图聚焦完成');

        // 4. 再等待一下
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. 尝试显示视图
        await vscode.commands.executeCommand('workbench.view.ollama-sequential-thinking.chatView');
        console.log('步骤3: 直接显示聊天视图完成');

        vscode.window.showInformationMessage('强制视图解析完成！');
      } catch (error) {
        console.error('强制视图解析失败:', error);
        vscode.window.showErrorMessage(`强制解析失败: ${error}`);
      }
    })
  );

  log('命令注册完成', 'info');
}