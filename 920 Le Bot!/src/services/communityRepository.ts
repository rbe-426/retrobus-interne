export interface CommunityPollOption {
  id: string;
  label: string;
  index: number;
  votes?: number;
}

export interface CommunityPoll {
  id: string;
  guildId: string;
  channelId: string;
  question: string;
  status: string;
  endsAt: string | null;
  options: CommunityPollOption[];
}

export interface CommunityRepository {
  recordActivity(guildId: string, userId: string, displayName: string): Promise<void>;
  leaderboard(guildId: string): Promise<Array<{ displayName: string; points: number; active: boolean }>>;
  createPoll(input: { guildId: string; creatorId: string; channelId: string; question: string; options: string[]; durationMinutes: number }): Promise<CommunityPoll>;
  attachPollMessage(guildId: string, pollId: string, messageId: string): Promise<void>;
  votePoll(guildId: string, pollId: string, optionId: string, userId: string): Promise<CommunityPollOption[]>;
  getPoll(guildId: string, pollId: string): Promise<CommunityPoll>;
  duePolls(): Promise<Array<{ id: string; guildId: string; channelId: string; messageId: string }>>;
  createSuggestion(guildId: string, creatorId: string, text: string): Promise<{ id: string }>;
  voteSuggestion(guildId: string, suggestionId: string, userId: string): Promise<{ votes: number; voted: boolean }>;
}

export function createApiCommunityRepository(apiUrl?: string, serviceToken?: string): CommunityRepository {
  const baseUrl = `${String(apiUrl || '').replace(/\/$/, '')}/api/bot920`;
  const headers = { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken || '' };
  const request = async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    if (!apiUrl || !serviceToken) throw new Error('Community API is not configured');
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  };

  return {
    async recordActivity(guildId, userId, displayName) {
      await request(`/guilds/${guildId}/activity`, 'POST', { userId, displayName });
    },
    async leaderboard(guildId) {
      const payload = await request<{ entries?: Array<{ displayName: string; points: number; active: boolean }> }>(`/guilds/${guildId}/leaderboard`);
      return payload.entries ?? [];
    },
    async createPoll(input) {
      const payload = await request<{ poll: CommunityPoll }>(`/guilds/${input.guildId}/polls`, 'POST', input);
      return payload.poll;
    },
    async attachPollMessage(guildId, pollId, messageId) {
      await request(`/guilds/${guildId}/polls/${pollId}/message`, 'POST', { messageId });
    },
    async votePoll(guildId, pollId, optionId, userId) {
      const payload = await request<{ options: CommunityPollOption[] }>(`/guilds/${guildId}/polls/${pollId}/votes`, 'POST', { optionId, userId });
      return payload.options;
    },
    async getPoll(guildId, pollId) {
      const payload = await request<{ poll: CommunityPoll }>(`/guilds/${guildId}/polls/${pollId}`);
      return payload.poll;
    },
    async duePolls() {
      const payload = await request<{ polls?: Array<{ id: string; guildId: string; channelId: string; messageId: string }> }>('/polls/due');
      return payload.polls ?? [];
    },
    async createSuggestion(guildId, creatorId, text) {
      const payload = await request<{ suggestion: { id: string } }>(`/guilds/${guildId}/suggestions`, 'POST', { creatorId, text });
      return payload.suggestion;
    },
    async voteSuggestion(guildId, suggestionId, userId) {
      return await request(`/guilds/${guildId}/suggestions/${suggestionId}/votes`, 'POST', { userId });
    },
  };
}