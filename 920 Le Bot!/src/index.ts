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
import { createApiDiscordLogEventRepository } from './services/discordLogEventRepository.js';
import { DiscordLogService } from './services/discordLogService.js';
import { createApiUpdateLogRepository } from './commands/updateLog.js';
import { createApiCardCollectionRepository } from './services/cardCollectionRepository.js';
import { CardCollectionInteractions } from './services/cardCollectionInteractions.js';
import { createApiModeratorRoleRepository } from './services/moderatorRoleRepository.js';
import { ModeratorRoleManagement } from './services/moderatorRoleManagement.js';
import { createApiBot920FeedbackRepository } from './services/feedbackRepository.js';
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
const discordLogEventRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiDiscordLogEventRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const birthdayInteractions = new BirthdayInteractions(birthdayRepository);
const getReleaseNotes = createApiUpdateLogRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
const cardCollection = createApiCardCollectionRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
const collectionInteractions = new CardCollectionInteractions(cardCollection);
const moderatorRoleRepository = env.RBE_API_URL && env.BOT920_SERVICE_TOKEN
  ? createApiModeratorRoleRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN)
  : undefined;
const moderatorRoleManagement = new ModeratorRoleManagement(moderatorRoleRepository);
const feedbackRepository = createApiBot920FeedbackRepository(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
const configurationStore = createBot920ConfigurationStore(env.RBE_API_URL, env.BOT920_SERVICE_TOKEN);
const discordLogs = new DiscordLogService(configurationStore.getLogging, discordLogEventRepository);
const moderation = new ModerationService(temporaryBanRepository, moderationCaseRepository, discordLogs, moderatorRoleRepository);
await configurationStore.refresh();
const bot = createDiscordBot(createCommands(birthdayInteractions, configurationStore.get, moderation, getReleaseNotes, cardCollection, collectionInteractions, moderatorRoleManagement, feedbackRepository), birthdayInteractions, configurationStore.get, configurationStore.getAutoModeration, collectionInteractions);
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