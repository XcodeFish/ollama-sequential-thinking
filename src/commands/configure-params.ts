import * as vscode from 'vscode';
import { log } from '../utils/logger';

/**
 * 模型参数配置
 */
interface ModelParams {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

/**
 * 配置模型参数命令
 */
export async function configureModelParams(): Promise<void> {
  try {
    // 获取当前配置
    const config = vscode.workspace.getConfiguration('ollama-sequential-thinking');
    const currentParams: ModelParams = {
      temperature: config.get<number>('temperature') || 0.7,
      maxTokens: config.get<number>('maxTokens') || 2048,
      topP: config.get<number>('topP') || 0.9,
      topK: config.get<number>('topK') || 40
    };
    
    // 显示温度配置
    const temperature = await vscode.window.showInputBox({
      title: '配置模型温度',
      prompt: '设置模型生成的随机性 (0.0-1.0)，较低的值使输出更确定，较高的值使输出更随机',
      value: currentParams.temperature.toString(),
      validateInput: (value) => {
        const num = Number(value);
        return (!isNaN(num) && num >= 0 && num <= 1) ? null : '请输入0到1之间的数值';
      }
    });
    
    if (temperature === undefined) {return;} // 用户取消
    
    // 显示最大token配置
    const maxTokens = await vscode.window.showInputBox({
      title: '配置最大生成token数',
      prompt: '设置模型最多生成的token数量',
      value: currentParams.maxTokens.toString(),
      validateInput: (value) => {
        const num = Number(value);
        return (!isNaN(num) && num > 0 && num <= 8192) ? null : '请输入1到8192之间的整数';
      }
    });
    
    if (maxTokens === undefined) {return;} // 用户取消
    
    // 显示top_p配置
    const topP = await vscode.window.showInputBox({
      title: '配置Top-P采样参数',
      prompt: '设置nucleus采样阈值 (0.0-1.0)，控制输出多样性',
      value: currentParams.topP.toString(),
      validateInput: (value) => {
        const num = Number(value);
        return (!isNaN(num) && num >= 0 && num <= 1) ? null : '请输入0到1之间的数值';
      }
    });
    
    if (topP === undefined) {return;} // 用户取消
    
    // 显示top_k配置
    const topK = await vscode.window.showInputBox({
      title: '配置Top-K采样参数',
      prompt: '设置考虑的最高概率token数量',
      value: currentParams.topK.toString(),
      validateInput: (value) => {
        const num = Number(value);
        return (!isNaN(num) && num > 0 && Number.isInteger(Number(value))) ? null : '请输入正整数';
      }
    });
    
    if (topK === undefined) {return;} // 用户取消
    
    // 保存配置
    await config.update('temperature', Number(temperature), vscode.ConfigurationTarget.Global);
    await config.update('maxTokens', Number(maxTokens), vscode.ConfigurationTarget.Global);
    await config.update('topP', Number(topP), vscode.ConfigurationTarget.Global);
    await config.update('topK', Number(topK), vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage('模型参数配置已更新');
    log('更新模型参数配置', 'info');
  } catch (error) {
    log(`配置模型参数失败: ${error}`, 'error');
    vscode.window.showErrorMessage(`配置失败: ${error}`);
  }
} 