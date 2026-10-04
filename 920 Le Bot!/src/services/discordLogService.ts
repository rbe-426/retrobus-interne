import type { Guild } from 'discord.js';
import type { DiscordLogConfiguration } from '../config/bot920Configuration.js';
import type { DiscordLogEventRepository } from './discordLogEventRepository.js';
import { logger } from '../utils/logger.js';

export interface ModerationLogRecord {
  guildId: string;
  eventType: 'kick' | 'mute' | 'unmute' | 'ban' | 'tempban' | 'unban';
  targetUserId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  durationMinutes?: number;
  expiresAt?: Date;
}

export class DiscordLogService {
  constructor(
    private readonly getConfiguration: (guildId: string) => DiscordLogConfiguration,
    private readonly repository?: DiscordLogEventRepository,
  ) {}

  async record(guild: Guild, record: ModerationLogRecord): Promise<void> {
    try {
      await this.repository?.create(record);
    } catch (error) {
      logger.warn('logs', `Enregistrement API indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
    }

    const rule = this.getConfiguration(guild.id).rules.find((entry) => entry.type === 'MODERATION' && entry.enabled);
    if (!rule) return;
    try {
      const channel = await guild.channels.fetch(rule.channelId);
      if (channel?.isSendable()) await channel.send({ content: `Modération : ${record.targetTag} - ${record.eventType} par ${record.moderatorTag}. Motif : ${record.reason}` });
    } catch (error) {
      logger.warn('logs', `Envoi Discord indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
    }
  }
}