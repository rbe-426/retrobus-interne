export interface DueTemporaryBan {
  id: string;
  guildId: string;
  userId: string;
}

export interface TemporaryBanRepository {
  schedule(record: { guildId: string; userId: string; expiresAt: Date; reason: string; moderatorId: string }): Promise<void>;
  cancel(guildId: string, userId: string): Promise<void>;
  listDue(): Promise<readonly DueTemporaryBan[]>;
  complete(id: string): Promise<void>;
}

function buildUrl(apiUrl: string, path: string): string {
  return `${apiUrl.replace(/\/$/, '')}${path}`;
}

export function createApiTemporaryBanRepository(apiUrl: string, serviceToken: string): TemporaryBanRepository {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(buildUrl(apiUrl, path), {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-bot920-service-token': serviceToken,
        ...options.headers,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Service de modération RBE indisponible (HTTP ${response.status}).`);
    return response.json() as Promise<T>;
  }

  return {
    async schedule(record) {
      await request('/api/bot920/temp-bans', { method: 'POST', body: JSON.stringify({ ...record, expiresAt: record.expiresAt.toISOString() }) });
    },
    async cancel(guildId, userId) {
      await request(`/api/bot920/temp-bans/guilds/${guildId}/users/${userId}`, { method: 'DELETE' });
    },
    async listDue() {
      const payload = await request<{ bans?: DueTemporaryBan[] }>('/api/bot920/temp-bans/due');
      return payload.bans ?? [];
    },
    async complete(id) {
      await request(`/api/bot920/temp-bans/${id}/complete`, { method: 'POST' });
    },
  };
}