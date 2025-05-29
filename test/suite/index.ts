import * as path from 'path';
import Mocha from 'mocha';
import { globSync } from 'glob';

/**
 * 运行测试套件
 */
export function run(): Promise<void> {
  // 创建Mocha测试实例
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise<void>((resolve, reject) => {
    try {
      // 查找所有测试文件
      const files = globSync('**/**.test.js', { cwd: testsRoot });
      
      // 添加测试文件
      files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

      // 运行测试
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
} 