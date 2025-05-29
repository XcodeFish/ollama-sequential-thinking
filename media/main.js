/* eslint-disable no-undef */
// WebView主脚本
(function() {
  // 获取VSCode API
  // @ts-expect-error WebView环境中的全局函数
  const vscode = acquireVsCodeApi();
  
  // 初始化时保存状态
  vscode.postMessage({ command: 'ready' });
  
  // 初始化函数
  function initialize() {
    // 绑定代码复制按钮事件
    document.querySelectorAll('.copy-button').forEach(button => {
      button.addEventListener('click', () => {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock.querySelector('code').innerText;
        vscode.postMessage({
          command: 'copyCode',
          code: code
        });
      });
    });
    
    // 绑定代码插入按钮事件
    document.querySelectorAll('.insert-button').forEach(button => {
      button.addEventListener('click', () => {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock.querySelector('code').innerText;
        vscode.postMessage({
          command: 'insertCode',
          code: code
        });
      });
    });
  }
  
  // 当DOM内容加载完成后初始化
  document.addEventListener('DOMContentLoaded', initialize);
  
  // 如果DOM已经加载完成，立即初始化
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initialize();
  }
})(); 