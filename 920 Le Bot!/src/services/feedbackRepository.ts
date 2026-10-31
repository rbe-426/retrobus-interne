export type Bot920FeedbackType = 'SUGGESTION' | 'INCIDENT';

export interface Bot920FeedbackRepository {
  create(input: {
    guildId: string;
    authorId: string;
    authorName: string;
    type: Bot920FeedbackType;
    title: string;
    description: string;
  }): Promise<{ id: string; reference: string; status: string; createdAt: string }>;
  listByAuthor(guildId: string, authorId: string): Promise<Bot920FeedbackTicket[]>;
}

export interface Bot920FeedbackTicket {
  id: string;
  reference: string;
  type: Bot920FeedbackType;
  title: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
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
      const payload = await response.json() as { feedback: { id: string; reference: string; status: string; createdAt: string } };
      return payload.feedback;
    },
    async listByAuthor(guildId, authorId) {
      if (!apiUrl || !serviceToken) throw new Error('Bot 920 feedback API is not configured');
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/bot920/guilds/${guildId}/feedback/mine?authorId=${encodeURIComponent(authorId)}`, {
        headers: { 'x-bot920-service-token': serviceToken },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { items: Bot920FeedbackTicket[] };
      return payload.items;
    },
  };
}
