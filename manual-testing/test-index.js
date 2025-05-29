/**
 * Ollama扩展测试文件
 * 该文件仅用于在编辑器中打开，以测试扩展功能
 */

// 测试函数
function testFunction() {
  // eslint-disable-next-line no-console
  console.log('测试函数被调用');
  return 'Hello from Ollama Sequential Thinking!';
}

// 测试类
class TestClass {
  constructor() {
    this.name = 'Ollama';
  }

  sayHello() {
    return `Hello from ${this.name}!`;
  }
}

// 导出测试对象
// eslint-disable-next-line no-undef
module.exports = {
  testFunction,
  TestClass
};

// 简单注释，帮助测试扩展功能 