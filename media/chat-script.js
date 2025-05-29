/* eslint-disable no-undef */
// @ts-expect-error WebView环境中的全局函数
const vscode = acquireVsCodeApi();

// 状态管理
let isProcessing = false;
let currentModel = '';
let models = [];
let thinkingSteps = [];

// DOM元素
let chatMessages;
let questionInput;
let sendButton;
let modelSelector;
let clearButton;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  chatMessages = document.getElementById('chat-messages');
  questionInput = document.getElementById('question-input');
  sendButton = document.getElementById('send-button');
  modelSelector = document.getElementById('model-selector');
  clearButton = document.getElementById('clear-button');
  
  // 绑定事件
  sendButton.addEventListener('click', sendQuestion);
  questionInput.addEventListener('keydown', handleInputKeydown);
  modelSelector.addEventListener('change', changeModel);
  clearButton.addEventListener('click', clearChat);
  
  // 通知扩展WebView已准备好
  vscode.postMessage({ command: 'ready' });
});

// 处理来自扩展的消息
window.addEventListener('message', event => {
  const message = event.data;
  
  switch (message.command) {
    case 'updateModels':
      updateModelSelector(message.models, message.currentModel);
      break;
    case 'processingStarted':
      handleProcessingStarted(message.question);
      break;
    case 'processingComplete':
      handleProcessingComplete(message.result);
      break;
    case 'updateThinkingStep':
      updateThinkingStep(message.stage, message.content, message.isComplete, message.stepIndex);
      break;
    case 'addAnswer':
      addAnswer(message.result);
      break;
    case 'error':
      showError(message.message);
      break;
    case 'modelChanged':
      currentModel = message.model;
      break;
    case 'chatCleared':
      chatMessages.innerHTML = createWelcomeMessage();
      thinkingSteps = [];
      break;
    case 'loadHistoryItem':
      loadHistoryItem(message.item);
      break;
    case 'updateHistory':
      // 历史记录更新逻辑，可以在侧边添加历史记录列表
      break;
  }
});

// 发送问题
function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || isProcessing) {return;}
  
  vscode.postMessage({
    command: 'askQuestion',
    question: question
  });
  
  // 清空输入框
  questionInput.value = '';
}

// 处理输入框按键事件
function handleInputKeydown(event) {
  // Ctrl+Enter 或 Cmd+Enter 发送
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    sendQuestion();
  }
}

// 更新模型选择器
function updateModelSelector(modelsList, current) {
  models = modelsList;
  currentModel = current;
  
  // 清空现有选项
  modelSelector.innerHTML = '';
  
  // 添加模型选项
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    option.selected = model === currentModel;
    modelSelector.appendChild(option);
  });
}

// 更改模型
function changeModel() {
  const selectedModel = modelSelector.value;
  if (selectedModel && selectedModel !== currentModel) {
    vscode.postMessage({
      command: 'changeModel',
      model: selectedModel
    });
  }
}

// 清空聊天
function clearChat() {
  vscode.postMessage({
    command: 'clearChat'
  });
}

// 处理开始处理
function handleProcessingStarted(question) {
  isProcessing = true;
  
  // 添加用户消息
  addUserMessage(question);
  
  // 添加正在思考的消息
  addThinkingMessage();
  
  // 禁用发送按钮
  sendButton.disabled = true;
  sendButton.classList.add('loading');
  
  // 重置思考步骤
  thinkingSteps = [];
}

// 处理处理完成
function handleProcessingComplete(result) {
  isProcessing = false;
  
  // 移除思考中的消息
  const thinkingMessage = document.querySelector('.message.thinking');
  if (thinkingMessage) {
    thinkingMessage.remove();
  }
  
  // 添加完整的回答
  addAssistantMessage(result);
  
  // 恢复发送按钮
  sendButton.disabled = false;
  sendButton.classList.remove('loading');
}

// 更新思考步骤
function updateThinkingStep(stage, content, isComplete, stepIndex) {
  // 查找或创建思考步骤
  if (!thinkingSteps[stepIndex]) {
    thinkingSteps[stepIndex] = {
      title: stage,
      content: '',
      isComplete: false
    };
  }
  
  // 更新内容
  thinkingSteps[stepIndex].content += content;
  thinkingSteps[stepIndex].isComplete = isComplete;
  
  // 更新UI
  updateThinkingUI();
}

// 更新思考UI
function updateThinkingUI() {
  // 查找思考消息
  const thinkingMessage = document.querySelector('.message.thinking');
  if (!thinkingMessage) {return;}
  
  const thinkingContent = thinkingMessage.querySelector('.thinking-steps');
  if (!thinkingContent) {return;}
  
  // 更新内容
  thinkingContent.innerHTML = '';
  
  thinkingSteps.forEach((step) => {
    const stepElement = document.createElement('div');
    stepElement.className = 'thinking-step';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'step-title';
    titleElement.textContent = step.title;
    
    if (!step.isComplete) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'thinking-indicator';
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'thinking-dot';
        loadingIndicator.appendChild(dot);
      }
      titleElement.appendChild(loadingIndicator);
    }
    
    const contentElement = document.createElement('div');
    contentElement.className = 'step-content';
    contentElement.textContent = step.content;
    
    stepElement.appendChild(titleElement);
    stepElement.appendChild(contentElement);
    thinkingContent.appendChild(stepElement);
  });
}

// 添加用户消息
function addUserMessage(text) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  
  const avatarElement = document.createElement('div');
  avatarElement.className = 'message-avatar';
  avatarElement.textContent = '👤';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  
  const textElement = document.createElement('div');
  textElement.className = 'message-text';
  textElement.textContent = text;
  
  contentElement.appendChild(textElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentElement);
  
  chatMessages.appendChild(messageElement);
  
  // 滚动到底部
  scrollToBottom();
}

// 添加助手消息
function addAssistantMessage(result) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message assistant';
  
  const avatarElement = document.createElement('div');
  avatarElement.className = 'message-avatar';
  avatarElement.textContent = '🤖';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  
  const textElement = document.createElement('div');
  textElement.className = 'message-text';
  textElement.innerHTML = formatMessageText(result.result);
  
  contentElement.appendChild(textElement);
  
  // 添加思考步骤（可折叠）
  if (result.steps && result.steps.length > 0) {
    const stepsToggle = document.createElement('div');
    stepsToggle.className = 'steps-toggle';
    stepsToggle.textContent = '查看思考过程 ▼';
    stepsToggle.addEventListener('click', toggleThinkingSteps);
    
    const stepsElement = document.createElement('div');
    stepsElement.className = 'thinking-steps hidden';
    
    result.steps.forEach(step => {
      const stepElement = document.createElement('div');
      stepElement.className = 'thinking-step';
      
      const titleElement = document.createElement('div');
      titleElement.className = 'step-title';
      titleElement.textContent = step.title;
      
      const contentElement = document.createElement('div');
      contentElement.className = 'step-content';
      contentElement.innerHTML = formatMessageText(step.content);
      
      stepElement.appendChild(titleElement);
      stepElement.appendChild(contentElement);
      stepsElement.appendChild(stepElement);
    });
    
    contentElement.appendChild(stepsToggle);
    contentElement.appendChild(stepsElement);
  }
  
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentElement);
  
  chatMessages.appendChild(messageElement);
  
  // 处理代码块操作
  setupCodeBlocks();
  
  // 滚动到底部
  scrollToBottom();
}

// 添加思考中的消息
function addThinkingMessage() {
  const messageElement = document.createElement('div');
  messageElement.className = 'message assistant thinking';
  
  const avatarElement = document.createElement('div');
  avatarElement.className = 'message-avatar';
  avatarElement.textContent = '🤖';
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  
  const textElement = document.createElement('div');
  textElement.className = 'message-text';
  textElement.textContent = '正在思考...';
  
  const thinkingStepsElement = document.createElement('div');
  thinkingStepsElement.className = 'thinking-steps';
  
  contentElement.appendChild(textElement);
  contentElement.appendChild(thinkingStepsElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentElement);
  
  chatMessages.appendChild(messageElement);
  
  // 滚动到底部
  scrollToBottom();
}

// 显示错误
function showError(message) {
  isProcessing = false;
  
  // 移除思考中的消息
  const thinkingMessage = document.querySelector('.message.thinking');
  if (thinkingMessage) {
    const contentElement = thinkingMessage.querySelector('.message-content');
    
    // 清除现有内容
    contentElement.innerHTML = '';
    
    // 添加错误信息
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    contentElement.appendChild(errorElement);
  } else {
    // 创建新的错误消息
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant';
    
    const avatarElement = document.createElement('div');
    avatarElement.className = 'message-avatar';
    avatarElement.textContent = '🤖';
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    contentElement.appendChild(errorElement);
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
  }
  
  // 恢复发送按钮
  sendButton.disabled = false;
  sendButton.classList.remove('loading');
  
  // 滚动到底部
  scrollToBottom();
}

// 简化的消息格式化，添加基础样式但不做复杂处理
function formatMessageText(text) {
  // 处理代码块，保留简化版本，只设置样式而不做高亮
  let formattedText = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
    return `<div class="code-block" style="writing-mode:horizontal-tb !important;direction:ltr !important;text-orientation:mixed !important;unicode-bidi:isolate !important;">
      <pre style="writing-mode:horizontal-tb !important;direction:ltr !important;text-orientation:mixed !important;unicode-bidi:isolate !important;white-space:pre !important;">
        <code style="writing-mode:horizontal-tb !important;direction:ltr !important;text-orientation:mixed !important;unicode-bidi:isolate !important;white-space:pre !important;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
      </pre>
    </div>`;
  });
  
  // 处理内联代码
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code style="writing-mode:horizontal-tb !important;direction:ltr !important;text-orientation:mixed !important;unicode-bidi:isolate !important;">$1</code>');
  
  // 处理换行
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  return formattedText;
}

// 设置代码块操作
function setupCodeBlocks() {
  // 代码块不再需要特殊操作，如复制或插入按钮
}

// 切换思考步骤显示
function toggleThinkingSteps(event) {
  const toggle = event.target;
  const stepsElement = toggle.nextElementSibling;
  
  if (stepsElement.classList.contains('hidden')) {
    stepsElement.classList.remove('hidden');
    toggle.textContent = '隐藏思考过程 ▲';
  } else {
    stepsElement.classList.add('hidden');
    toggle.textContent = '查看思考过程 ▼';
  }
}

// 加载历史记录项
function loadHistoryItem(item) {
  // 添加用户问题
  addUserMessage(item.question);
  
  // 添加助手回答
  addAssistantMessage(item.result);
}

// 滚动到底部
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 创建欢迎信息
function createWelcomeMessage() {
  return `
    <div class="welcome-message">
      <h2>欢迎使用 Ollama 助手</h2>
      <p>支持代码补全、需求拆解、代码生成、工程理解和技术问答。</p>
      <p>使用 <code>Cmd+l</code> 与我对话</p>
    </div>
  `;
} 