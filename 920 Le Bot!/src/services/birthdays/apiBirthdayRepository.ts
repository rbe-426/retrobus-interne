import type { BirthdayRecord, BirthdayRepository } from './birthdayRepositoryTypes.js';

interface BirthdayApiResponse {
  birthdays?: Array<Omit<BirthdayRecord, 'birthDate'> & { birthDate: string }>;
}

function buildUrl(apiUrl: string, path: string): string {
  return `${apiUrl.replace(/\/$/, '')}${path}`;
}

export function createApiBirthdayRepository(apiUrl: string, serviceToken: string): BirthdayRepository {
  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(buildUrl(apiUrl, path), {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-bot920-service-token': serviceToken,
        ...options.headers,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error('Le service anniversaires RBE est indisponible.');
    return response.json() as Promise<BirthdayApiResponse>;
  }

  return {
    async listByGuild(guildId) {
      const payload = await request(`/api/bot920/guilds/${guildId}/birthdays`);
      return (payload.birthdays ?? []).map((birthday) => ({
        ...birthday,
        birthDate: new Date(birthday.birthDate),
      }));
    },
    async upsert(record) {
      await request(`/api/bot920/guilds/${record.guildId}/birthdays/${record.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ displayName: record.displayName, birthDate: record.birthDate.toISOString() }),
      });
    },
  };
}