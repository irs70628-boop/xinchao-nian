import assert from 'node:assert/strict';
import test from 'node:test';
import { newState, settleAndApplyConversationEvent } from '../src/engine.js';

// 回归：config.interaction 传的是 maxEffectsPerDay（来自 INTERACTION_MAX_EFFECTS_PER_DAY），之前引擎只认另一个名字，上限永远是 24。
test('INTERACTION_MAX_EFFECTS_PER_DAY (maxEffectsPerDay) is honoured by the engine', () => {
  const now = new Date('2026-09-28T09:00:00Z');
  let state = newState(now);
  const day = '2026-09-28';
  state.interactionUsage = { [day]: 24 };
  const opts = { interaction: { maxEffectsPerDay: 48, timeZone: 'Asia/Taipei' }, settle: { timeZone: 'Asia/Taipei' } };
  const res = settleAndApplyConversationEvent(state, { eventId: 'cap-test-0001', interactionType: 'companionship' }, now, opts);
  assert.equal(res.interaction.applied, true);
  const blocked = settleAndApplyConversationEvent(state, { eventId: 'cap-test-0002', interactionType: 'companionship' }, now, { interaction: { timeZone: 'Asia/Taipei' }, settle: { timeZone: 'Asia/Taipei' } });
  assert.equal(blocked.interaction.reasonCode, 'daily_effect_limit');
});
