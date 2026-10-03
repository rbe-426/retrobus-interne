import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageFlags } from 'discord.js';
import { BirthdayInteractions } from '../src/services/birthdays/birthdayInteractions.js';

test('/920 anniversaire displays consultation and edit actions', async () => {
  let response: Record<string, unknown> | undefined;
  const interactions = new BirthdayInteractions();

  await interactions.showMenu({
    async reply(options) {
      response = options as Record<string, unknown>;
    },
  });

  assert.equal(response?.flags, MessageFlags.Ephemeral);
  assert.match(String(response?.content), /consulter la liste ou éditer/i);
  assert.equal(Array.isArray(response?.components), true);
});