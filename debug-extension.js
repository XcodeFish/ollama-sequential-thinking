// 调试扩展的简单脚本
const http = require('http');

// 测试Ollama连接
function testOllamaConnection() {
  console.log('测试Ollama连接...');
  
  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/tags',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('✅ Ollama连接成功');
        console.log('可用模型:', parsed.models?.map(m => m.name) || []);
      } catch (error) {
        console.log('❌ 解析响应失败:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Ollama连接失败:', error.message);
  });

  req.end();
}

// 测试生成请求
function testGenerate() {
  console.log('\n测试生成请求...');
  
  const data = JSON.stringify({
    model: 'deepseek-coder:1.3b',
    prompt: '你好',
    stream: false
  });

  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        console.log('✅ 生成请求成功');
        console.log('响应:', parsed.response?.substring(0, 100) + '...');
      } catch (error) {
        console.log('❌ 解析生成响应失败:', error.message);
        console.log('原始响应:', responseData.substring(0, 200));
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ 生成请求失败:', error.message);
  });

  req.write(data);
  req.end();
}

// 运行测试
testOllamaConnection();
setTimeout(testGenerate, 2000);
