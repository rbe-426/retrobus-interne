import { commands } from './commands/index.js';
import { env } from './config/env.js';
import { createApiServer } from './api/server.js';
import { createDiscordBot } from './services/discordBot.js';
import { logger } from './utils/logger.js';

const startedAt = new Date().toISOString();
const bot = createDiscordBot(commands);
const api = createApiServer({
  startedAt,
  commandCount: bot.commandCount,
  isDiscordConnected: () => bot.client.isReady(),
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

async function shutdown(signal: string) {
  logger.info('system', `Arrêt demandé (${signal})`);
  server.close();
  await bot.stop();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));