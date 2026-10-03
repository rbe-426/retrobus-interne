import { REST, Routes } from 'discord.js';
import { createCommands } from '../commands/index.js';
import { env } from '../config/env.js';
import { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';
import { logger } from '../utils/logger.js';

if (!env.DISCORD_TOKEN || !env.DISCORD_APPLICATION_ID || !env.DISCORD_GUILD_ID) {
  throw new Error('DISCORD_TOKEN, DISCORD_APPLICATION_ID et DISCORD_GUILD_ID sont requis pour enregistrer les commandes de test.');
}

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
const payload = createCommands(new BirthdayInteractions()).map((command) => command.data.toJSON());

await rest.put(
  Routes.applicationGuildCommands(env.DISCORD_APPLICATION_ID, env.DISCORD_GUILD_ID),
  { body: payload },
);

logger.info('commands', `${payload.length} commande(s) enregistrée(s) pour le serveur de test.`);