import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPresence, autoPresenceConfig } from '../src/auto-presence.js';

const t0 = new Date('2026-09-28T07:00:00Z');
const at = (min) => new Date(t0.getTime() + min * 60_000);

test('off by default', () => {
  assert.equal(autoPresenceConfig({}).enabled, false);
  assert.equal(new AutoPresence(autoPresenceConfig({})).decide('xinchao_context', 's', t0), null);
});

test('config parses switch and clamps minutes', () => {
  assert.deepEqual(autoPresenceConfig({ XINCHAO_AUTO_PRESENCE: 'true', XINCHAO_AUTO_PRESENCE_MINUTES: '1' }), { enabled: true, minutes: 5 });
  assert.equal(autoPresenceConfig({ XINCHAO_AUTO_PRESENCE: 'true', XINCHAO_AUTO_PRESENCE_MINUTES: 'x' }).minutes, 30);
});

test('any tool call records companionship at most once per window', () => {
  const p = new AutoPresence({ enabled: true, minutes: 30 });
  const first = p.decide('xinchao_context', 'sess', at(0));
  assert.equal(first.interactionType, 'companionship');
  assert.equal(p.decide('breath', 'sess', at(10)), null);
  assert.ok(p.decide('breath', 'sess', at(31)));
});

test('an explicit xinchao_event resets the window and is never doubled', () => {
  const p = new AutoPresence({ enabled: true, minutes: 30 });
  assert.equal(p.decide('xinchao_event', 'sess', at(0)), null);
  assert.equal(p.decide('xinchao_context', 'sess', at(20)), null);
  assert.ok(p.decide('xinchao_context', 'sess', at(35)));
});

test('event ids are stable within a window so retries dedupe', () => {
  const a = new AutoPresence({ enabled: true, minutes: 30 }).decide('pulse', 's', at(1));
  const b = new AutoPresence({ enabled: true, minutes: 30 }).decide('pulse', 's', at(2));
  assert.equal(a.eventId, b.eventId);
});
