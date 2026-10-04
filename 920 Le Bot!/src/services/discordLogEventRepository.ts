export interface DiscordLogEventRepository {
  create(record: {
    guildId: string;
    eventType: 'kick' | 'mute' | 'unmute' | 'ban' | 'tempban' | 'unban';
    targetUserId: string;
    targetTag: string;
    moderatorId: string;
    moderatorTag: string;
    reason: string;
    durationMinutes?: number;
    expiresAt?: Date;
  }): Promise<void>;
}

export function createApiDiscordLogEventRepository(apiUrl: string, serviceToken: string): DiscordLogEventRepository {
  return {
    async create(record) {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/bot920/guilds/${record.guildId}/log-events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken },
        body: JSON.stringify({ ...record, expiresAt: record.expiresAt?.toISOString() }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
  };
}