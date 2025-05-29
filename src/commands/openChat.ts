import * as vscode from "vscode";
import { log } from "../utils/logger";
/**
 * 打开聊天窗口处理程序
 * 简化版本仅尝试打开视图容器，避免使用可能不存在的命令
 */
export async function openChatView(): Promise<void> {
  try {
    log("执行打开聊天界面命令", "info");
    console.log("=== 开始执行 openChatView 命令 ===");
    // 强制设置上下文变量
    await vscode.commands.executeCommand("setContext", "ollama-plugin-active", true);
    // 直接尝试打开视图容器
    await vscode.commands.executeCommand("workbench.view.extension.ollama-sequential-thinking");
    // 等待视图容器加载
    await new Promise(resolve => setTimeout(resolve, 500));
    // 显示成功消息
    vscode.window.showInformationMessage("Ollama聊天界面已打开！请在左侧面板中查看。");
    log("openChatView 命令执行完成", "info");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`打开聊天界面命令执行失败: ${errorMessage}`, "error");
    console.error("打开聊天界面失败:", error);
    // 显示错误信息
    vscode.window.showErrorMessage(`无法打开聊天界面: ${errorMessage}。请手动点击左侧活动栏中的Ollama图标。`);
  }
}
