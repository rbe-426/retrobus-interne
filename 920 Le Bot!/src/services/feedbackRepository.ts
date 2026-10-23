export type Bot920FeedbackType = 'SUGGESTION' | 'INCIDENT';

export interface Bot920FeedbackRepository {
  create(input: {
    guildId: string;
    authorId: string;
    authorName: string;
    type: Bot920FeedbackType;
    title: string;
    description: string;
  }): Promise<{ id: string; status: string; createdAt: string }>;
}

export function createApiBot920FeedbackRepository(apiUrl?: string, serviceToken?: string): Bot920FeedbackRepository {
  return {
    async create(input) {
      if (!apiUrl || !serviceToken) throw new Error('Bot 920 feedback API is not configured');
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/bot920/guilds/${input.guildId}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken },
        body: JSON.stringify({ authorId: input.authorId, authorName: input.authorName, type: input.type, title: input.title, description: input.description }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { feedback: { id: string; status: string; createdAt: string } };
      return payload.feedback;
    },
  };
}
