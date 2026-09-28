import assert from 'node:assert/strict';
import test from 'node:test';
import { handleMcpMessage, obAnnotations, obProxyTools } from '../src/mcp-protocol.js';

// 原版 OB 3.6 的 tools/list：没有任何 annotations
const OB_TOOLS_36 = ['breath', 'breath_search', 'breath_advanced', 'hold', 'grow', 'trace', 'dream', 'anchor', 'release', 'pulse', 'plan', 'purge', 'I']
  .map((name) => ({ name, description: name, inputSchema: { type: 'object' } }));

function handlers(extra = {}) {
  return {
    listObTools: async () => OB_TOOLS_36,
    status: async () => ({ text: '此刻：平静\n连线：心潮 test · 记忆库 已接', ok: true }),
    nowLine: async () => 'NOWLINE',
    ...extra,
  };
}

test('xinchao_status is listed first-class and marked read-only', async () => {
  const res = await handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, handlers());
  const tool = res.body.result.tools.find((t) => t.name === 'xinchao_status');
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, true);
});

test('xinchao_status returns the status text without an extra now-line', async () => {
  const res = await handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'xinchao_status', arguments: {} } }, handlers());
  const text = res.body.result.content[0].text;
  assert.ok(text.includes('连线'));
  assert.ok(!text.includes('NOWLINE'));
});

test('OB tools without annotations get read-only hints for reads and write hints for the rest', async () => {
  const res = await handleMcpMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, handlers());
  const byName = Object.fromEntries(res.body.result.tools.map((t) => [t.name, t]));
  assert.equal(byName.breath.annotations.readOnlyHint, true);
  assert.equal(byName.pulse.annotations.readOnlyHint, true);
  assert.equal(byName.hold.annotations.readOnlyHint, false);
  assert.equal(byName.grow.annotations.readOnlyHint, false);
  assert.ok(!byName.purge, 'purge is never proxied');
});

test('OB-declared annotations are kept as-is', () => {
  const kept = obAnnotations({ name: 'hold', annotations: { readOnlyHint: true } });
  assert.equal(kept.readOnlyHint, true);
});

test('extra proxy tools come from config and purge/restore are refused', () => {
  const list = obProxyTools('breath_search, breath_advanced,plan,purge,restore,bad name');
  assert.ok(list.includes('breath_search'));
  assert.ok(list.includes('breath_advanced'));
  assert.ok(list.includes('plan'));
  assert.ok(!list.includes('purge'));
  assert.ok(!list.includes('restore'));
  assert.ok(!list.includes('bad name'));
  assert.ok(list.includes('breath'));
});
