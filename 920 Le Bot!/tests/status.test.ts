import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBotStatus } from '../src/api/status.js';

test('buildBotStatus exposes only public operational state', () => {
  assert.deepEqual(buildBotStatus('2026-10-03T12:00:00.000Z', true, 1, 42, 1), {
    status: 'ok',
    service: '920-le-bot',
    startedAt: '2026-10-03T12:00:00.000Z',
    discord: 'connected',
    commandCount: 1,
    latencyMs: 42,
    guildCount: 1,
  });
});