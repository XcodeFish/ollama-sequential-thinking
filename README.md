# Ollama Sequential Thinking

VSCode/Cursor插件，集成本地部署的Ollama大语言模型，实现基于sequential-thinking方法的代码智能辅助功能。通过逐步思考的方式解决复杂的编程问题，同时保持代码隐私安全。

## 主要功能

- **本地LLM集成**: 与Ollama本地大语言模型无缝集成，所有代码和数据都在本地处理
- **逐步思考**: 采用sequential-thinking方法分解解决复杂编程问题
- **双编辑器支持**: 同时兼容VSCode和Cursor编辑器
- **聊天界面**: 内置聊天界面，支持代码高亮和Markdown渲染
- **多种交互方式**: 支持聊天窗口、命令面板和状态栏按钮等多种交互方式
- **多模型支持**: 支持Ollama的各种模型，如CodeLlama、Deepseek-coder、Mistral等

## 截图演示

![聊天界面](media/chat-screenshot.png)

## 系统要求

- **Node.js**: 16.x或更高版本
- **Ollama**: 最新版本
- **VSCode**: 1.83.0或更高版本 / Cursor编辑器
- **支持平台**: Windows、macOS、Linux

## 安装步骤

### 1. 安装Ollama

**macOS/Linux**:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**:

1. 访问 [https://ollama.com/download](https://ollama.com/download)
2. 下载并安装Windows版本
3. 启动Ollama应用

### 2. 下载和安装代码模型

```bash
# 推荐使用deepseek-coder模型(默认配置)
ollama pull deepseek-coder:1.3b

# 或者其他支持的模型
ollama pull codellama:7b
ollama pull mistral:7b
```

### 3. 安装插件

**从VSCode/Cursor扩展市场安装**:

1. 打开VSCode/Cursor
2. 转到扩展面板(Ctrl+Shift+X或Cmd+Shift+X)
3. 搜索"Ollama Sequential Thinking"
4. 点击安装

**手动安装**:

1. 下载最新的.vsix文件
2. 在VSCode/Cursor中，转到扩展面板
3. 点击"..."，选择"从VSIX安装..."
4. 选择下载的.vsix文件

## 使用指南

### 启动插件

安装后，Ollama助手图标将显示在编辑器左侧活动栏中。点击图标打开Ollama助手面板。

### 常用功能

1. **聊天界面**:
   - 点击左侧活动栏的Ollama图标
   - 在聊天输入框中输入问题并按Enter发送
   - 支持Markdown格式和代码高亮显示

2. **提问代码问题**:
   - 命令: `Ollama: 提问(Sequential-thinking)` (Cmd/Ctrl+Shift+A)
   - 在输入框中输入问题，插件会结合当前代码上下文回答

3. **生成代码**:
   - 命令: `Ollama: 生成代码(Sequential-thinking)` (Cmd/Ctrl+Shift+G)
   - 描述你需要的代码功能，插件会生成相应代码

4. **切换模型**:
   - 点击状态栏中的模型名称
   - 或使用命令: `Ollama: 选择模型`
   - 从列表中选择已安装的模型

5. **配置模型参数**:
   - 使用命令: `Ollama: 配置模型参数`
   - 或点击状态栏中的参数按钮

### 快捷键

- **提问**: `Cmd/Ctrl+Shift+A`
- **生成代码**: `Cmd/Ctrl+Shift+G`

## 配置选项

在VSCode/Cursor设置中可以配置以下选项:

```json
{
  "ollama-sequential-thinking.apiEndpoint": "http://localhost:11434",
  "ollama-sequential-thinking.defaultModel": "deepseek-coder:1.3b",
  "ollama-sequential-thinking.maxTokens": 2048,
  "ollama-sequential-thinking.temperature": 0.7,
  "ollama-sequential-thinking.topP": 0.9,
  "ollama-sequential-thinking.topK": 40,
  "ollama-sequential-thinking.useStreamingOutput": true
}
```

### 主要配置项说明

| 配置项 | 说明 | 默认值 |
|------|------|-------|
| apiEndpoint | Ollama API地址 | <http://localhost:11434> |
| defaultModel | 默认使用的模型 | deepseek-coder:1.3b |
| maxTokens | 生成的最大token数 | 2048 |
| temperature | 生成随机性(0-1) | 0.7 |
| topP | Top-P采样参数(0-1) | 0.9 |
| topK | Top-K采样参数 | 40 |

## 故障排除

### 常见问题

1. **无法连接到Ollama服务**:
   - 确认Ollama应用已启动
   - 验证API端点设置是否正确(默认为<http://localhost:11434>)
   - 检查防火墙设置是否阻止了连接

2. **模型列表为空**:
   - 确保已使用Ollama CLI下载了至少一个模型
   - 运行`ollama list`查看已安装的模型

3. **响应生成很慢**:
   - 尝试使用更小的模型(如deepseek-coder:1.3b代替更大的模型)
   - 降低maxTokens参数值
   - 检查是否有足够的系统资源(RAM和GPU)

4. **代码生成质量不佳**:
   - 调整temperature参数(更低的值产生更确定的输出)
   - 尝试不同的模型
   - 提供更清晰、更详细的指令

## 进阶使用

### 自定义提示词

可以通过修改代码中的提示词模板来优化特定任务的提示词。

### 本地模型优化

对于有经验的用户，可以使用Ollama的Modelfile创建优化的模型:

```
# 示例: 优化deepseek-coder模型
FROM deepseek-coder:1.3b
PARAMETER temperature 0.5
PARAMETER top_p 0.8
PARAMETER num_ctx 8192
```

使用以下命令创建和使用自定义模型:

```bash
ollama create custom-deepseek -f Modelfile
```

## 贡献

欢迎通过Issue和PR参与项目贡献！

## 许可证

[MIT](LICENSE)
