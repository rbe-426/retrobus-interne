import { createCommands } from './commands/index.js';
import { env } from './config/env.js';
import { createApiServer } from './api/server.js';
import { createApiBirthdayRepository } from './services/birthdays/apiBirthdayRepository.js';
import { BirthdayInteractions } from './services/birthdays/birthdayInteractions.js';
import { createDiscordBot } from './services/discordBot.js';
import { logger } from './utils/logger.js';

const startedAt = new Date().toISOString();
const birthdayRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiBirthdayRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const birthdayInteractions = new BirthdayInteractions(birthdayRepository);
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

if (!birthdayRepository) {
  logger.warn('birthdays', 'RBE_API_URL ou BOT920_SERVICE_TOKEN absent : le module anniversaires est indisponible.');
}

async function shutdown(signal: string) {
  logger.info('system', `Arrêt demandé (${signal})`);
  server.close();
  await bot.stop();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));