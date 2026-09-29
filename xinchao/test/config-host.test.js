import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

function withEnv(value, fn) {
  const saved = process.env.HOST;
  if (value === undefined) delete process.env.HOST; else process.env.HOST = value;
  try { return fn(); } finally {
    if (saved === undefined) delete process.env.HOST; else process.env.HOST = saved;
  }
}

test('HOST 未设置时仍监听 0.0.0.0（现有部署行为不变）', () => {
  assert.equal(withEnv(undefined, () => loadConfig().host), '0.0.0.0');
  assert.equal(withEnv('', () => loadConfig().host), '0.0.0.0');
  assert.equal(withEnv('   ', () => loadConfig().host), '0.0.0.0');
});

test('HOST=127.0.0.1 时只监听本机', () => {
  assert.equal(withEnv('127.0.0.1', () => loadConfig().host), '127.0.0.1');
});

test('server.js 使用 config.host 而不是写死的地址', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(source, /server\.listen\(config\.port, config\.host,/);
  assert.doesNotMatch(source, /server\.listen\([^)]*'0\.0\.0\.0'/);
});
