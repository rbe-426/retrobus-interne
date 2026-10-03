import assert from 'node:assert/strict';
import test from 'node:test';
import { command920 } from '../src/commands/920.js';

test('/920 exposes the expected Phase 1 subcommands', () => {
  const command = command920.data.toJSON();

  assert.equal(command.name, '920');
  assert.deepEqual(
    command.options?.map((option) => option.name),
    ['ping', 'about', 'anniversaire'],
  );
});