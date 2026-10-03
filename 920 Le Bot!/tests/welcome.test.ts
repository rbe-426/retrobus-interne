import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultBot920Configuration } from '../src/config/bot920Configuration.js';
import { isWelcomeEnabled, renderWelcomeMessage } from '../src/services/welcome.js';

test('welcome configuration requires an enabled flag, a Discord channel ID, and a message', () => {
  const configuration = structuredClone(defaultBot920Configuration);
  configuration.welcome.welcomeEnabled = true;
  configuration.welcome.welcomeChannelId = '123456789012345678';

  assert.equal(isWelcomeEnabled(configuration), true);
  configuration.welcome.welcomeChannelId = 'not-a-discord-id';
  assert.equal(isWelcomeEnabled(configuration), false);
});

test('welcome messages render supported member variables', () => {
  const message = renderWelcomeMessage(
    'Bienvenue {user} ({username}) sur {server}, tu es le membre {member_count}.',
    { userId: '123456789012345678', username: 'Waiyl', serverName: 'RBE', memberCount: 920 },
  );

  assert.equal(message, 'Bienvenue <@123456789012345678> (Waiyl) sur RBE, tu es le membre 920.');
});