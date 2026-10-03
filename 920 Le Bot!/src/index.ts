import { createCommands } from './commands/index.js';
import { env } from './config/env.js';
import { createApiServer } from './api/server.js';
import { createBirthdayDatabase } from './database/birthdayRepository.js';
import { BirthdayInteractions } from './services/birthdays/birthdayInteractions.js';
import { createDiscordBot } from './services/discordBot.js';
import { logger } from './utils/logger.js';

const startedAt = new Date().toISOString();
const birthdayDatabase = env.BOT_DATABASE_URL ? createBirthdayDatabase(env.BOT_DATABASE_URL) : undefined;
const birthdayInteractions = new BirthdayInteractions(birthdayDatabase?.repository);
const bot = createDiscordBot(createCommands(birthdayInteractions), birthdayInteractions);
const api = createApiServer({
  startedAt,
  commandCount: bot.commandCount,
  isDiscordConnected: () => bot.client.isReady(),
  getDiscordLatencyMs: () => {
    const latency = bot.client.ws.ping;
    return Number.isFinite(latency) && latency >= 0 ? Math.round(latency) : null;
  },
  getGuildCount: () => bot.client.guilds.cache.size,
});

const server = api.listen(env.BOT_PORT, () => {
  logger.info('api', `Health check disponible sur le port ${env.BOT_PORT}`);
});

if (env.DISCORD_TOKEN) {
  bot.start(env.DISCORD_TOKEN).catch((error) => {
    logger.error('discord', 'Connexion impossible', error instanceof Error ? error : undefined);
    process.exitCode = 1;
  });
} else {
  logger.warn('discord', 'DISCORD_TOKEN absent : démarrage en mode standby.');
}

if (!birthdayDatabase) {
  logger.warn('birthdays', 'BOT_DATABASE_URL absent : le module anniversaires est indisponible.');
}

async function shutdown(signal: string) {
  logger.info('system', `Arrêt demandé (${signal})`);
  server.close();
  await bot.stop();
  await birthdayDatabase?.disconnect();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));