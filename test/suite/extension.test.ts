import * as assert from 'assert';
import * as vscode from 'vscode';

suite('扩展测试套件', () => {
  test('插件应该被激活', async () => {
    // 检查插件是否已激活
    const extension = vscode.extensions.getExtension('ollama-plugin.ollama-sequential-thinking');
    assert.ok(extension);

    // 如果已安装，检查是否已激活
    if (extension) {
      // 等待激活完成
      await extension.activate();
      assert.strictEqual(extension.isActive, true);
    }
  });

  test('命令应该被注册', () => {
    // 简单测试命令是否已注册
    return vscode.commands.getCommands(true).then(commands => {
      const hasAskQuestion = commands.includes('ollama-sequential-thinking.askQuestion');
      const hasGenerateCode = commands.includes('ollama-sequential-thinking.generateCode');
      
      assert.strictEqual(hasAskQuestion, true, '应包含askQuestion命令');
      assert.strictEqual(hasGenerateCode, true, '应包含generateCode命令');
    });
  });
}); 