import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

function endpoint(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, '')}/api/bot920/guild-context`;
}

function channelPosition(channel: object): number {
  const position = Number((channel as { rawPosition?: unknown }).rawPosition);
  return Number.isInteger(position) ? position : 0;
}

export async function syncDiscordGuildInventory(client: Client, apiUrl?: string, serviceToken?: string): Promise<void> {
  if (!apiUrl || !serviceToken || !client.isReady()) return;

  const guilds = client.guilds.cache.map((guild) => ({
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL({ size: 128 }) ?? null,
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    channels: guild.channels.cache.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: channelPosition(channel),
    })),
    roles: guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .map((role) => ({ id: role.id, name: role.name, color: role.hexColor, position: role.position, managed: role.managed })),
  }));

  try {
    const response = await fetch(endpoint(apiUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken },
      body: JSON.stringify({ guilds }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logger.info('discord', `Contexte synchronisé pour ${guilds.length} serveur(s).`);
  } catch (error) {
    logger.warn('discord', `Synchronisation du contexte indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
  }
}