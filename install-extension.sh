#!/bin/bash

# Ollama Sequential Thinking 插件安装脚本

echo "🚀 开始安装 Ollama Sequential Thinking 插件..."

# 检查是否存在 VSIX 文件
VSIX_FILE="ollama-sequential-thinking-3.4.0.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ 错误: 找不到 $VSIX_FILE 文件"
    echo "请先运行 'npm run package' 来生成插件包"
    exit 1
fi

echo "📦 找到插件包: $VSIX_FILE"

# 检查是否安装了 VS Code
if command -v code &> /dev/null; then
    echo "✅ 检测到 VS Code"

    # 卸载旧版本（如果存在）
    echo "🗑️  卸载旧版本插件..."
    code --uninstall-extension codefish.ollama-sequential-thinking 2>/dev/null || true

    # 安装新版本
    echo "📥 安装新版本插件..."
    code --install-extension "$VSIX_FILE" --force

    if [ $? -eq 0 ]; then
        echo "✅ VS Code 插件安装成功！"
        echo "💡 请重启 VS Code 以确保插件正常工作"
    else
        echo "❌ VS Code 插件安装失败"
    fi
else
    echo "⚠️  未检测到 VS Code 命令行工具"
fi

# 检查是否安装了 Cursor
if command -v cursor &> /dev/null; then
    echo "✅ 检测到 Cursor"

    # 卸载旧版本（如果存在）
    echo "🗑️  卸载旧版本插件..."
    cursor --uninstall-extension codefish.ollama-sequential-thinking 2>/dev/null || true

    # 安装新版本
    echo "📥 安装新版本插件..."
    cursor --install-extension "$VSIX_FILE" --force

    if [ $? -eq 0 ]; then
        echo "✅ Cursor 插件安装成功！"
        echo "💡 请重启 Cursor 以确保插件正常工作"
    else
        echo "❌ Cursor 插件安装失败"
    fi
else
    echo "⚠️  未检测到 Cursor 命令行工具"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "📋 使用说明："
echo "1. 重启您的编辑器 (VS Code 或 Cursor)"
echo "2. 确保 Ollama 服务正在运行 (http://localhost:11434)"
echo "3. 使用快捷键或命令面板来使用插件功能："
echo "   - Ctrl+Shift+A (Cmd+Shift+A): 提问"
echo "   - Ctrl+Shift+G (Cmd+Shift+G): 生成代码"
echo "   - 或在命令面板中搜索 'Ollama'"
echo ""
echo "🔧 如果遇到问题，请检查："
echo "1. Ollama 是否正在运行"
echo "2. 插件是否在扩展列表中显示为已启用"
echo "3. 查看开发者控制台的错误信息"
