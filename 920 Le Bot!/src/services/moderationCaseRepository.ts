export interface ModerationCaseRepository {
  create(record: {
    guildId: string;
    targetUserId: string;
    targetTag: string;
    moderatorId: string;
    moderatorTag: string;
    action: 'kick' | 'mute' | 'unmute' | 'ban' | 'tempban' | 'unban';
    reason: string;
    durationMinutes?: number;
    expiresAt?: Date;
  }): Promise<void>;
}

export function createApiModerationCaseRepository(apiUrl: string, serviceToken: string): ModerationCaseRepository {
  return {
    async create(record) {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/bot920/moderation-cases`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken },
        body: JSON.stringify({ ...record, expiresAt: record.expiresAt?.toISOString() }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
  };
}