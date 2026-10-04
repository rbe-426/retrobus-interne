import { createCommands } from './commands/index.js';
import { env } from './config/env.js';
import { createApiServer } from './api/server.js';
import { createApiBirthdayRepository } from './services/birthdays/apiBirthdayRepository.js';
import { BirthdayInteractions } from './services/birthdays/birthdayInteractions.js';
import { createBot920ConfigurationStore } from './services/bot920ConfigurationStore.js';
import { createDiscordBot } from './services/discordBot.js';
import { syncDiscordGuildInventory } from './services/discordGuildInventorySync.js';
import { ModerationService } from './services/moderation.js';
import { createApiModerationCaseRepository } from './services/moderationCaseRepository.js';
import { createApiTemporaryBanRepository } from './services/temporaryBanRepository.js';
import { logger } from './utils/logger.js';

const startedAt = new Date().toISOString();
const birthdayRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiBirthdayRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const temporaryBanRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiTemporaryBanRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const moderationCaseRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiModerationCaseRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const birthdayInteractions = new BirthdayInteractions(birthdayRepository);
const moderation = new ModerationService(temporaryBanRepository, moderationCaseRepository);
const configurationStore = createBot920ConfigurationStore(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
await configurationStore.refresh();
const bot = createDiscordBot(createCommands(birthdayInteractions, configurationStore.get, moderation), birthdayInteractions, configurationStore.get);
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

const server = api.listen(env.BOT_PORT, '0.0.0.0', () => {
  logger.info('api', `Health check disponible sur le port ${env.BOT_PORT}`);
});

if (env.DISCORD_TOKEN) {
  bot.start(env.DISCORD_TOKEN)
    .then(async () => {
      await moderation.processDueTemporaryBans(bot.client);
      await syncDiscordGuildInventory(bot.client, env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
      await Promise.all(bot.client.guilds.cache.map((guild) => configurationStore.refreshGuild(guild.id)));
    })
    .catch((error) => {
      logger.error('discord', 'Connexion impossible', error instanceof Error ? error : undefined);
      process.exitCode = 1;
    });
} else {
  logger.warn('discord', 'DISCORD_TOKEN absent : démarrage en mode standby.');
}

if (!birthdayRepository) {
  logger.warn('birthdays', 'RBE_API_URL ou BOT920_SERVICE_TOKEN absent : le module anniversaires est indisponible.');
}

const configurationRefresh = setInterval(() => {
  void configurationStore.refresh();
  void Promise.all(bot.client.guilds.cache.map((guild) => configurationStore.refreshGuild(guild.id)));
}, 60_000);
configurationRefresh.unref();
const temporaryBanSweep = setInterval(() => void moderation.processDueTemporaryBans(bot.client), 60_000);
temporaryBanSweep.unref();
const guildInventorySync = setInterval(() => void syncDiscordGuildInventory(bot.client, env.RBE_API_URL, env.BOT920_SERVICE_TOKEN), 10 * 60_000);
guildInventorySync.unref();

async function shutdown(signal: string) {
  logger.info('system', `Arrêt demandé (${signal})`);
  clearInterval(configurationRefresh);
  clearInterval(temporaryBanSweep);
  clearInterval(guildInventorySync);
  server.close();
  await bot.stop();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));