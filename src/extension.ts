import * as vscode from 'vscode';
import { registerCommands } from './commands/index';
import { log } from './utils/logger';
import { EditorAdapter } from './adapter/index';
import { OllamaManager } from './services';
import { HistoryManager } from './core/history';
import { ModelsView } from './ui/views/models-view';
import { ContextCollector } from './core/context';
import { registerHistoryView } from './ui/views/history-view';
import { registerChatView } from './ui/views/chat-view';
import { registerWelcomeView } from './ui/views/welcome-view';

// 检测编辑器类型
const isVSCode = vscode.env.appName.includes('Visual Studio Code');
const isCursor = vscode.env.appName.includes('Cursor');

/**
 * 插件激活入口
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // 强制设置上下文变量以确保视图容器显示
    vscode.commands.executeCommand('setContext', 'ollama-plugin-active', true);

    // 显示通知，确认插件已激活
    vscode.window.showInformationMessage('Ollama插件已激活');
    console.log('Ollama插件已激活');

    log('插件激活', 'info');

    // 初始化Ollama管理器
    const ollamaManager = OllamaManager.getInstance();

    // 注册所有视图
    console.log('开始注册视图...');
    registerWelcomeView(context);
    console.log('欢迎视图注册完成');

    registerChatView(context, ollamaManager.getClient());
    console.log('聊天视图注册完成');

    // 注册模型管理视图
    console.log('开始注册模型视图...');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        ModelsView.viewType,
        new ModelsView(context.extensionUri, ollamaManager.getClient()),
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    );
    console.log('模型视图注册完成');

    // 强制显示视图容器，并默认打开聊天视图
    setTimeout(async () => {
      try {
        console.log('=== 开始强制显示视图容器 ===');

        // 1. 先确保活动栏显示
        await vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
        await vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
        console.log('活动栏可见性已确保');

        // 2. 显示视图容器
        console.log('尝试显示视图容器...');
        await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        console.log('视图容器显示命令执行完成');

        // 3. 等待视图容器加载
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. 尝试聚焦聊天视图
        console.log('尝试聚焦聊天视图...');
        await vscode.commands.executeCommand('ollama-sequential-thinking.chatView.focus');
        console.log('聊天视图聚焦命令执行完成');

        // 5. 显示成功消息
        vscode.window.showInformationMessage('Ollama助手已准备就绪！请在左侧活动栏中查看。');
        console.log('=== 视图容器显示流程完成 ===');

      } catch (error) {
        console.error('显示视图容器失败:', error);
        log(`显示Ollama视图容器失败: ${error}`, 'error');

        // 显示手动操作提示
        const result = await vscode.window.showWarningMessage(
          'Ollama助手视图可能未正确显示。请手动点击左侧活动栏中的Ollama图标。',
          '打开视图'
        );

        if (result === '打开视图') {
          await vscode.commands.executeCommand('workbench.view.extension.ollama-sequential-thinking');
        }
      }
    }, 2000);

  // 异步初始化Ollama管理器
  ollamaManager.init();

  // 初始化历史记录管理器
  const historyManager = HistoryManager.getInstance(context);

  // 初始化缓存管理器
  // const cacheManager = CacheManager.getInstance(context);

  // 初始化编辑器适配器
  const editorType = getEditorType();
  log(`检测到编辑器类型: ${editorType}`, 'info');

  // 初始化适配器
  const adapter = new EditorAdapter(context, editorType);

  // 将上下文收集器添加到adapter
  adapter.setContextCollector(new ContextCollector());

  // 注册历史记录树视图 - 暂时禁用
  // registerHistoryView(context, historyManager);

  // 注册命令
  registerCommands(context);

  // 注册询问状态栏按钮
  const askStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  askStatusBarItem.text = '$(comment) 提问';
  askStatusBarItem.tooltip = 'Ollama: 提问大模型';
  askStatusBarItem.command = 'ollama-sequential-thinking.askQuestion';
  askStatusBarItem.show();

  // 添加聊天界面状态栏按钮
  const chatStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  chatStatusBarItem.text = '$(comment-discussion) 聊天';
  chatStatusBarItem.tooltip = 'Ollama: 打开聊天界面';
  chatStatusBarItem.command = 'ollama-sequential-thinking.openChatView';
  console.log('注册聊天状态栏按钮，命令:', chatStatusBarItem.command);
  chatStatusBarItem.show();

  // 注册模型选择状态栏按钮
  const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
  updateModelStatusBarItem(modelStatusBarItem, ollamaManager.getDefaultModel());
  modelStatusBarItem.command = 'ollama-sequential-thinking.selectModel';
  modelStatusBarItem.show();

  // 注册历史记录状态栏按钮
  const historyStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
  historyStatusBarItem.text = '$(history) 历史';
  historyStatusBarItem.tooltip = 'Ollama: 查看历史记录';
  historyStatusBarItem.command = 'ollama-sequential-thinking.viewHistory';
  historyStatusBarItem.show();

  // 注册参数配置状态栏按钮
  const configStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
  configStatusBarItem.text = '$(gear) 参数';
  configStatusBarItem.tooltip = 'Ollama: 配置模型参数';
  configStatusBarItem.command = 'ollama-sequential-thinking.configureModelParams';
  configStatusBarItem.show();

  // 监听模型变化事件
  const modelChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('ollama-sequential-thinking.defaultModel')) {
      const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
      const model = config.get<string>('defaultModel') || 'codellama:7b';
      updateModelStatusBarItem(modelStatusBarItem, model);
    }
  });

  // 将状态栏项添加到订阅列表
  context.subscriptions.push(
    askStatusBarItem,
    chatStatusBarItem,
    modelStatusBarItem,
    historyStatusBarItem,
    configStatusBarItem,
    modelChangeDisposable
  );

    log('插件注册完成', 'info');
    console.log('插件注册完成');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`插件激活失败: ${errorMessage}`, 'error');
    console.error('插件激活失败:', error);
    vscode.window.showErrorMessage(`Ollama插件激活失败: ${errorMessage}`);
  }
}

/**
 * 更新模型状态栏项目
 * @param statusBarItem 状态栏项
 * @param model 模型名称
 */
function updateModelStatusBarItem(statusBarItem: vscode.StatusBarItem, model: string): void {
  statusBarItem.text = `$(symbol-misc) ${model}`;
  statusBarItem.tooltip = `当前模型: ${model} (点击切换)`;
}

/**
 * 获取编辑器类型
 */
function getEditorType(): 'vscode' | 'cursor' | 'unknown' {
  if (isCursor) {
    return 'cursor';
  }
  if (isVSCode) {
    return 'vscode';
  }
  return 'unknown';
}

/**
 * 插件停用处理
 */
export function deactivate() {
  try {
    // 清理资源
    log('正在清理插件资源...', 'info');

    // 将来可以在这里添加其他清理逻辑

    log('插件停用', 'info');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`插件停用过程中出现错误: ${errorMessage}`, 'error');
  }
}