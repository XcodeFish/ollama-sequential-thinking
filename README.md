# Ollama Sequential Thinking

VSCode/Cursor插件，集成本地部署的Ollama大语言模型，实现基于sequential-thinking方法的代码智能辅助功能。

## 特性

- 集成本地Ollama大语言模型，保护代码隐私
- 利用sequential-thinking逐步思考方法解决复杂问题
- 同时支持VSCode和Cursor编辑器
- 代码生成、问题解答、代码重构等功能

## 依赖项

- [Node.js](https://nodejs.org/) 16.x或更高版本
- [Ollama](https://ollama.com/) 最新版本
- 支持的模型: CodeLlama, Llama2, Mistral等

## 安装

### 1. 安装Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# 访问 https://ollama.com/download 下载安装
```

### 2. 拉取代码模型

```bash
ollama pull codellama:7b
```

### 3. 安装插件

- 从VSCode/Cursor扩展市场搜索"Ollama Sequential Thinking"并安装
- 或使用VSIX文件手动安装

## 使用方法

1. 在编辑器中打开一个代码文件
2. 使用以下命令：
   - `Ollama: 提问` (Cmd/Ctrl+Shift+A): 向Ollama提问
   - `Ollama: 生成代码` (Cmd/Ctrl+Shift+G): 生成代码

## 配置选项

在VSCode/Cursor设置中可以配置以下选项：

- `ollama-sequential-thinking.apiEndpoint`: Ollama API端点 (默认: <http://localhost:11434/api>)
- `ollama-sequential-thinking.defaultModel`: 默认使用的模型 (默认: codellama:7b)
- `ollama-sequential-thinking.maxTokens`: 生成的最大token数 (默认: 2048)
- `ollama-sequential-thinking.temperature`: 生成随机性 (默认: 0.7)

## 开发

### 准备开发环境

```bash
# 克隆仓库
git clone https://github.com/your-username/ollama-plugin.git
cd ollama-plugin

# 安装依赖
npm install

# 编译
npm run compile

# 启动开发实例
npm run watch
```

### 测试插件

按F5启动调试实例，在新窗口中测试插件功能。

## 贡献

欢迎通过Issue和PR参与项目贡献！

## 许可证

[MIT](LICENSE)
