import { defaultBot920Configuration, type Bot920Configuration } from '../config/bot920Configuration.js';
import { logger } from '../utils/logger.js';

interface ConfigurationResponse {
  configuration?: Bot920Configuration;
}

function buildUrl(apiUrl: string, guildId?: string): string {
  const baseUrl = `${apiUrl.replace(/\/$/, '')}/api/bot920`;
  return guildId ? `${baseUrl}/guilds/${guildId}/config` : `${baseUrl}/config`;
}

export function createBot920ConfigurationStore(apiUrl?: string, serviceToken?: string) {
  let configuration = defaultBot920Configuration;
  const guildConfigurations = new Map<string, Bot920Configuration>();

  return {
    get: (guildId?: string) => guildId ? guildConfigurations.get(guildId) ?? configuration : configuration,
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
        const response = await fetch(buildUrl(apiUrl, guildId), {
          headers: { 'x-bot920-service-token': serviceToken },
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as ConfigurationResponse;
        if (payload.configuration) guildConfigurations.set(guildId, payload.configuration);
        return this.get(guildId);
      } catch (error) {
        logger.warn('config', `Configuration du serveur ${guildId} indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
        return this.get(guildId);
      }
    },
  };
}