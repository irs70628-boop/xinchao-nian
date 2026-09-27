import assert from 'node:assert/strict';
import test from 'node:test';
import { OmbreClient } from '../src/ombre-client.js';

// 原版 OB 3.6 的 breath / pulse 输出样式（表头没有 [domain:]）
const BREATH_36 = [
  '=== 浮现记忆 ===\n[权重:9.74] [bucket_id:85f3c019fc9c]\n今天也算你的',
  '[权重:7.20] [bucket_id:4ca6f114c8df]\n工作放假的事',
  '[权重:9.74] [bucket_id:4940b0bbeeda]\nOmbre Brain 记忆库配置',
].join('\n---\n');
const PULSE_36 = [
  '=== 我现在的记忆 ===\n固化桶: 1 个\n动态桶: 3 个',
  '=== 记忆列表 ===',
  '📌 [06e42d38f9ec] 《我叫澄》 主题:自我 情感:V0.5/A0.3 重要:10 权重:999.00',
  '💭 [85f3c019fc9c] 《今天也算你的》 主题:人际,社交 情感:V0.9/A0.6 重要:8 权重:9.74 标签:中秋节',
  '💭 [4ca6f114c8df] 《工作放假的事》 主题:她的故事 情感:V0.3/A0.4 重要:7 权重:7.20',
  '💭 [4940b0bbeeda] 《Ombre Brain 记忆库配置》 主题:数字,事务 情感:V0.8/A0.6 重要:8 权重:9.74',
].join('\n');

function fakeClient() {
  const calls = [];
  const client = new OmbreClient({ url: 'http://x/mcp', token: 't', readEnabled: true, breathMaxResults: 3 });
  client.call = async (name) => {
    calls.push(name);
    const text = name === 'pulse' ? PULSE_36 : BREATH_36;
    return { result: { content: [{ type: 'text', text }] } };
  };
  return { client, calls };
}

test('OB 3.6 breath without [domain:] gets domains from pulse and drops technical buckets', async () => {
  const { client, calls } = fakeClient();
  const refs = await client.thoughtMaterialWithRefs([], null, new Date('2026-09-27T12:00:00Z'), []);
  assert.deepEqual(refs.bucketIds, ['85f3c019fc9c', '4ca6f114c8df']);
  assert.deepEqual(refs.domains.sort(), ['人际', '她的故事', '社交'].sort());
  assert.ok(calls.includes('pulse'));
});

test('domain lookup is cached between surfacings', async () => {
  const { client, calls } = fakeClient();
  await client.daytimeMaterialWithRefs([], null, new Date('2026-09-27T12:00:00Z'), []);
  await client.thoughtMaterialWithRefs([], null, new Date('2026-09-27T12:00:00Z'), []);
  assert.equal(calls.filter((c) => c === 'pulse').length, 1);
});

test('breath that already carries [domain:] is untouched and pulse is not called', async () => {
  const { client, calls } = fakeClient();
  client.call = async (name) => { calls.push(name); return { result: { content: [{ type: 'text', text: '[权重:5] [bucket_id:abc123def456] [domain:恋爱]\n一段' }] } }; };
  const refs = await client.thoughtMaterialWithRefs([], null, new Date(), []);
  assert.deepEqual(refs.domains, ['恋爱']);
  assert.ok(!calls.includes('pulse'));
});

test('pulse failure leaves the original refs intact', async () => {
  const { client } = fakeClient();
  client.call = async (name) => { if (name === 'pulse') throw new Error('boom'); return { result: { content: [{ type: 'text', text: BREATH_36 }] } }; };
  const refs = await client.thoughtMaterialWithRefs([], null, new Date(), []);
  assert.equal(refs.bucketIds.length, 3);
  assert.deepEqual(refs.domains, []);
});
