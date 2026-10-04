import type { BirthdayRecord, BirthdayRepository } from './birthdayRepositoryTypes.js';

interface BirthdayApiResponse {
  birthdays?: Array<Omit<BirthdayRecord, 'birthDate'> & { birthDate: string }>;
}

const REQUEST_TIMEOUT_MS = 2_000;
const SERVICE_UNAVAILABLE_MESSAGE = 'Le service anniversaires RBE est indisponible.';

function buildUrl(apiUrl: string, path: string): string {
  return `${apiUrl.replace(/\/$/, '')}${path}`;
}

export function createApiBirthdayRepository(apiUrl: string, serviceToken: string): BirthdayRepository {
  async function request(path: string, options: RequestInit = {}) {
    try {
      const response = await fetch(buildUrl(apiUrl, path), {
        ...options,
        headers: {
          'content-type': 'application/json',
          'x-bot920-service-token': serviceToken,
          ...options.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
      return response.json() as Promise<BirthdayApiResponse>;
    } catch (error) {
      if (error instanceof Error && error.message === SERVICE_UNAVAILABLE_MESSAGE) throw error;
      throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
    }
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