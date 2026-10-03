import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPingMessage } from '../src/commands/pingMessage.js';

test('formatPingMessage returns the public ping response', () => {
  assert.equal(
    formatPingMessage(42),
    '🏓 Pong !\n\n920 Le Bot ! est opérationnel.\n\nLatence : 42 ms',
  );
});