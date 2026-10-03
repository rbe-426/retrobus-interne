import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommand920 } from '../src/commands/920.js';
import { BirthdayInteractions } from '../src/services/birthdays/birthdayInteractions.js';

test('/920 exposes the expected Phase 1 subcommands', () => {
  const command = createCommand920(new BirthdayInteractions()).data.toJSON();

  assert.equal(command.name, '920');
  assert.deepEqual(
    command.options?.map((option) => option.name),
    ['ping', 'about', 'anniversaire', 'phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage'],
  );
});