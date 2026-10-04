import { defaultBot920Configuration, legacyAutoModConfiguration, type AutoModConfiguration, type Bot920Configuration, type DiscordLogConfiguration } from '../config/bot920Configuration.js';
import { logger } from '../utils/logger.js';

interface ConfigurationResponse {
  configuration?: Bot920Configuration;
}

interface AutoModConfigurationResponse {
  rules?: AutoModConfiguration['rules'];
  words?: AutoModConfiguration['words'];
}

interface DiscordLogConfigurationResponse {
  rules?: DiscordLogConfiguration['rules'];
}

function buildUrl(apiUrl: string, guildId?: string): string {
  const baseUrl = `${apiUrl.replace(/\/$/, '')}/api/bot920`;
  return guildId ? `${baseUrl}/guilds/${guildId}/config` : `${baseUrl}/config`;
}

function buildAutoModUrl(apiUrl: string, guildId: string): string {
  return `${apiUrl.replace(/\/$/, '')}/api/bot920/guilds/${guildId}/automod`;
}

function buildLoggingUrl(apiUrl: string, guildId: string): string {
  return `${apiUrl.replace(/\/$/, '')}/api/bot920/guilds/${guildId}/logging`;
}

export function createBot920ConfigurationStore(apiUrl?: string, serviceToken?: string) {
  let configuration = defaultBot920Configuration;
  const guildConfigurations = new Map<string, Bot920Configuration>();
  const guildAutoModConfigurations = new Map<string, AutoModConfiguration>();
  const guildLogConfigurations = new Map<string, DiscordLogConfiguration>();

  return {
    get: (guildId?: string) => guildId ? guildConfigurations.get(guildId) ?? configuration : configuration,
    getAutoModeration: (guildId: string) => guildAutoModConfigurations.get(guildId) ?? legacyAutoModConfiguration(guildConfigurations.get(guildId) ?? configuration),
    getLogging: (guildId: string) => guildLogConfigurations.get(guildId) ?? { rules: [] },
    async refresh() {
      if (!apiUrl || !serviceToken) return configuration;

      try {
        const response = await fetch(buildUrl(apiUrl), {
          headers: { 'x-bot920-service-token': serviceToken },
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as ConfigurationResponse;
        if (payload.configuration) configuration = payload.configuration;
        return configuration;
      } catch (error) {
        logger.warn('config', `Configuration distante indisponible, cache conservé (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
        return configuration;
      }
    },
    async refreshGuild(guildId: string) {
      if (!apiUrl || !serviceToken || !guildId) return this.get(guildId);
      try {
        const [configurationResponse, autoModResponse, loggingResponse] = await Promise.all([
          fetch(buildUrl(apiUrl, guildId), { headers: { 'x-bot920-service-token': serviceToken }, signal: AbortSignal.timeout(5_000) }),
          fetch(buildAutoModUrl(apiUrl, guildId), { headers: { 'x-bot920-service-token': serviceToken }, signal: AbortSignal.timeout(5_000) }),
          fetch(buildLoggingUrl(apiUrl, guildId), { headers: { 'x-bot920-service-token': serviceToken }, signal: AbortSignal.timeout(5_000) }),
        ]);
        if (!configurationResponse.ok) throw new Error(`Configuration HTTP ${configurationResponse.status}`);
        const payload = await configurationResponse.json() as ConfigurationResponse;
        if (payload.configuration) guildConfigurations.set(guildId, payload.configuration);
        if (!autoModResponse.ok) throw new Error(`AutoMod HTTP ${autoModResponse.status}`);
        const autoModPayload = await autoModResponse.json() as AutoModConfigurationResponse;
        if (Array.isArray(autoModPayload.rules) && Array.isArray(autoModPayload.words)) {
          guildAutoModConfigurations.set(guildId, { rules: autoModPayload.rules, words: autoModPayload.words });
        }
        if (!loggingResponse.ok) throw new Error(`Journaux HTTP ${loggingResponse.status}`);
        const loggingPayload = await loggingResponse.json() as DiscordLogConfigurationResponse;
        if (Array.isArray(loggingPayload.rules)) guildLogConfigurations.set(guildId, { rules: loggingPayload.rules });
        return this.get(guildId);
      } catch (error) {
        logger.warn('config', `Configuration AutoMod du serveur ${guildId} indisponible, cache conservé (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
        return this.get(guildId);
      }
    },
  };
}