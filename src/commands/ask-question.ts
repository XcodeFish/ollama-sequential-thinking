import * as vscode from 'vscode';
import { EditorAdapter } from '../adapter';
import { log } from '../utils/logger';
import { ThinkingResult, ThinkingStep, ThinkingStage, SequentialThinkingEngine } from '../core/engine';
import { ResultPanel } from '../ui/panels/result-panel';
import { HistoryManager } from '../core/history';

/**
 * 提问命令实现
 * @param context 扩展上下文
 * @param adapter 编辑器适配器
 */
export async function askQuestion(context: vscode.ExtensionContext, adapter: EditorAdapter): Promise<void> {
  try {
    // 获取用户输入
    const question = await vscode.window.showInputBox({
      prompt: '请输入您的问题',
      placeHolder: '例如: 如何实现一个React组件?'
    });

    if (!question) {
      return;
    }

    // 显示进度
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '思考中...',
      cancellable: true
    }, async (progress, token) => {
      // 获取当前编辑器内容作为上下文
      const editorContent = adapter.getActiveEditorContent() || '';

      // 获取Ollama客户端
      const ollamaClient = adapter.getOllamaClient();

      // 获取当前使用的模型
      const currentModel = ollamaClient.getDefaultModel();

      // 获取配置
      const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
      // 修复流式输出设置，确保始终启用
      const useStreamingOutput = true; // 强制开启流式输出
      
      // 创建Sequential-thinking引擎
      const engine = new SequentialThinkingEngine(ollamaClient);
      
      // 获取历史记录管理器
      const historyManager = HistoryManager.getInstance(context);

      // 开始计时
      const startTime = Date.now();

      try {
        if (useStreamingOutput) {
          // 流式处理
          // 创建初始结果数据
          const initialResult: ThinkingResult = {
            question,
            result: '',
            model: currentModel,
            processTime: 0,
            steps: []
          };
          
          // 创建并显示结果面板，使用流式模式
          const panel = ResultPanel.createOrShow(context.extensionUri, initialResult);
          panel.startStreaming(initialResult);
          
          // 使用流式引擎处理
          await engine.streamProcess(
            question,
            editorContent,
            (stage, content, isComplete, stepIndex) => {
              // 回调函数，处理流式更新
              if (token.isCancellationRequested) {
                return;
              }
              
              // 更新进度提示
              progress.report({ message: `正在${stage}...` });
              
              if (content) {
                // 如果有新内容，添加到面板
                panel.appendToResult(content, stepIndex);
              }
              
              if (isComplete) {
                // 如果阶段完成，可以添加下一个阶段
                if (stage !== ThinkingStage.FINALIZE) {
                  // 查找下一个阶段
                  const nextStage = getNextStage(stage);
                  if (nextStage) {
                    // 创建新步骤
                    const newStep: ThinkingStep = {
                      title: nextStage,
                      content: '',
                      timestamp: Date.now()
                    };
                    
                    // 添加到面板
                    panel.addThinkingStep(newStep);
                  }
                }
              }
            },
            {
              options: {
                model: currentModel,
                temperature: config.get<number>('temperature') || 0.7,
                max_tokens: config.get<number>('maxTokens') || 2048,
                top_p: config.get<number>('topP') || 0.9,
                top_k: config.get<number>('topK') || 40
              }
            }
          ).then(result => {
            // 处理完成
            const processTime = Date.now() - startTime;
            result.processTime = processTime;
            
            // 结束流式响应
            panel.endStreaming();
            
            // 添加到历史记录
            historyManager.addHistoryItem(result);
            
            log(`回答生成成功，使用模型: ${currentModel}，耗时: ${processTime}ms`, 'info');
          });
        } else {
          // 非流式处理
          progress.report({ message: '正在思考...' });
          
          // 使用引擎处理
          const result = await engine.process(
            question,
            editorContent,
            {
              options: {
                model: currentModel,
                temperature: config.get<number>('temperature') || 0.7,
                max_tokens: config.get<number>('maxTokens') || 2048,
                top_p: config.get<number>('topP') || 0.9,
                top_k: config.get<number>('topK') || 40
              }
            }
          );
          
          // 计算处理时间
          const processTime = Date.now() - startTime;
          result.processTime = processTime;
          
          // 显示结果面板
          ResultPanel.createOrShow(context.extensionUri, result);
          
          // 添加到历史记录
          historyManager.addHistoryItem(result);
          
          log(`回答生成成功，使用模型: ${currentModel}，耗时: ${processTime}ms`, 'info');
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          log('用户取消了请求', 'info');
          vscode.window.showInformationMessage('已取消请求');
        } else {
          throw error;
        }
      }
    });
  } catch (error) {
    log(`处理问题时出错: ${error}`, 'error');
    adapter.showMessage(`处理失败: ${error}`, 'error');
  }
}

/**
 * 获取下一个思考阶段
 * @param currentStage 当前阶段
 * @returns 下一个阶段
 */
function getNextStage(currentStage: ThinkingStage): ThinkingStage | null {
  const stages = [
    ThinkingStage.UNDERSTAND,
    ThinkingStage.ANALYZE,
    ThinkingStage.APPROACH,
    ThinkingStage.SOLUTION,
    ThinkingStage.VERIFY,
    ThinkingStage.FINALIZE
  ];
  
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex !== -1 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }
  
  return null;
} 