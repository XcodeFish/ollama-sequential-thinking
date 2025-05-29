# Ollama Sequential Thinking 插件故障排除指南

## 常见问题及解决方案

### 1. 命令未找到错误 (command not found)

**错误信息**: `command 'ollama-sequential-thinking.openChatView' not found`

**可能原因**:
- 插件未正确安装
- 插件未激活
- VS Code/Cursor 需要重启

**解决方案**:
1. **重新安装插件**:
   ```bash
   # macOS/Linux
   ./install-extension.sh
   
   # Windows
   install-extension.bat
   ```

2. **手动安装**:
   ```bash
   # VS Code
   code --install-extension ollama-sequential-thinking-1.3.0.vsix --force
   
   # Cursor
   cursor --install-extension ollama-sequential-thinking-1.3.0.vsix --force
   ```

3. **重启编辑器**: 完全关闭并重新打开 VS Code 或 Cursor

4. **检查插件状态**: 
   - 打开扩展面板 (Ctrl+Shift+X)
   - 搜索 "Ollama Sequential Thinking"
   - 确保插件已启用

### 2. Ollama 连接失败

**错误信息**: 网络连接错误或 API 调用失败

**解决方案**:
1. **检查 Ollama 服务**:
   ```bash
   # 检查 Ollama 是否运行
   curl http://localhost:11434/api/tags
   
   # 启动 Ollama (如果未运行)
   ollama serve
   ```

2. **检查配置**:
   - 打开 VS Code/Cursor 设置
   - 搜索 "ollama-sequential-thinking"
   - 确认 API 端点设置为 `http://localhost:11434`

3. **防火墙设置**: 确保防火墙允许访问端口 11434

### 3. 模型加载失败

**错误信息**: 模型列表为空或模型加载失败

**解决方案**:
1. **安装模型**:
   ```bash
   # 安装推荐的模型
   ollama pull codellama:7b
   ollama pull llama2:7b
   ```

2. **检查已安装模型**:
   ```bash
   ollama list
   ```

3. **更新默认模型**: 在插件设置中选择已安装的模型

### 4. 插件激活失败

**症状**: 插件在扩展列表中但功能不可用

**解决方案**:
1. **查看开发者控制台**:
   - 按 F12 打开开发者工具
   - 查看 Console 标签页的错误信息

2. **检查依赖**:
   ```bash
   # 重新安装依赖
   npm install
   npm run compile
   npm run package
   ```

3. **清除缓存**:
   - 关闭编辑器
   - 删除 `~/.vscode/extensions` 中的旧版本插件文件夹
   - 重新安装插件

### 5. 快捷键不工作

**解决方案**:
1. **检查快捷键冲突**:
   - 打开快捷键设置 (Ctrl+K Ctrl+S)
   - 搜索 "ollama-sequential-thinking"
   - 检查是否有冲突

2. **使用命令面板**:
   - 按 Ctrl+Shift+P (Cmd+Shift+P)
   - 输入 "Ollama" 查看可用命令

### 6. WebView 显示问题

**症状**: 聊天界面无法正常显示

**解决方案**:
1. **检查 CSP 设置**: 确保内容安全策略允许加载资源

2. **清除 WebView 缓存**:
   - 重启编辑器
   - 重新打开聊天界面

3. **检查媒体文件**: 确保 `media/` 目录下的文件完整

## 调试步骤

### 1. 启用详细日志
在插件设置中启用调试模式，查看详细的日志输出。

### 2. 检查网络连接
```bash
# 测试 Ollama API
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "codellama:7b", "prompt": "Hello", "stream": false}'
```

### 3. 验证插件文件
确保以下文件存在且完整:
- `out/src/extension.js`
- `media/chat-script.js`
- `media/chat-styles.css`
- `resources/icons/logo.jpg`

## 获取帮助

如果以上解决方案都无法解决问题，请:

1. **收集信息**:
   - 操作系统版本
   - VS Code/Cursor 版本
   - 插件版本
   - 错误信息截图
   - 开发者控制台日志

2. **提交问题**:
   - 在 GitHub 仓库创建 Issue
   - 提供详细的错误描述和重现步骤

3. **临时解决方案**:
   - 使用命令面板手动执行命令
   - 直接访问 Ollama API 进行测试
