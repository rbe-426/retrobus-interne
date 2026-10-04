import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommand920 } from '../src/commands/920.js';
import { BirthdayInteractions } from '../src/services/birthdays/birthdayInteractions.js';
import { defaultBot920Configuration, isBot920CommandEnabled } from '../src/config/bot920Configuration.js';

test('/920 exposes the expected Phase 1 subcommands', () => {
  const command = createCommand920(new BirthdayInteractions()).data.toJSON();

  assert.equal(command.name, '920');
  assert.deepEqual(
    command.options?.map((option) => option.name),
    ['ping', 'about', 'anniversaire', 'phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage', 'ecouter', 'kick', 'mute', 'unmute', 'ban', 'tempban', 'unban'],
  );
});

test('Bot 920 respects persisted command and fun flags', () => {
  const configuration = structuredClone(defaultBot920Configuration);
  configuration.commands.enabled.ping = false;
  configuration.fun.enabled = false;

  assert.equal(isBot920CommandEnabled(configuration, 'ping'), false);
  assert.equal(isBot920CommandEnabled(configuration, 'phrase'), false);
  assert.equal(isBot920CommandEnabled(configuration, 'about'), true);
});