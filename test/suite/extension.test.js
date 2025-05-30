"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
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
//# sourceMappingURL=extension.test.js.map