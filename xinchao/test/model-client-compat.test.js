import assert from 'node:assert/strict';
import test from 'node:test';
import { ModelClient } from '../src/model-client.js';

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (url, init) => { const body = JSON.parse(init.body); bodies.push(body); return handler(body); };
  return fn(bodies).finally(() => { globalThis.fetch = original; });
}
const ok = (content) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });
const bad = { ok: false, status: 400, json: async () => ({}) };
const cfg = (baseUrl) => ({ enabled: true, apiKey: 'k', name: 'm', baseUrl, timeoutMs: 1000, maxOutputTokens: 100 });

test('Gemini endpoint never receives the non-standard thinking field', () => withFetch(
  (body) => ('thinking' in body ? bad : ok('{"type":"affection","tone":"warm"}')),
  async (bodies) => {
    const client = new ModelClient(cfg('https://generativelanguage.googleapis.com/v1beta/openai'));
    const tag = await client.classifyInteraction('她：抱抱\n他：抱緊妳');
    assert.equal(tag.type, 'affection');
    assert.ok(bodies.every((b) => !('thinking' in b)));
  },
));

test('any endpoint that rejects extra fields gets a clean retry', () => withFetch(
  (body) => ('thinking' in body || 'reasoning_effort' in body ? bad : ok('{"type":"sharing","tone":"calm"}')),
  async (bodies) => {
    const client = new ModelClient(cfg('https://example.test/v1'));
    const tag = await client.classifyInteraction('她：今天好累\n他：辛苦了');
    assert.equal(tag.type, 'sharing');
    assert.equal(bodies.length, 2);
  },
));

test('a persistent 400 is still reported', () => withFetch(
  () => bad,
  async () => {
    const client = new ModelClient(cfg('https://example.test/v1'));
    await assert.rejects(() => client.classifyInteraction('她：嗨'), /HTTP 400/);
  },
));
