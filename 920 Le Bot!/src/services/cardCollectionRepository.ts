import type { RBECollectibleCard } from '../commands/funContent.js';

export interface OwnedCollectibleCard extends RBECollectibleCard {
  quantity: number;
  firstAcquired: string;
}

export interface CardCollectionRepository {
  recordDrop(guildId: string, userId: string, card: RBECollectibleCard): Promise<{ duplicate: boolean; quantity: number; drawsRemaining: number; resetAt: string }>;
  getCollection(guildId: string, userId: string): Promise<{ cards: OwnedCollectibleCard[]; uniqueCards: number; totalCards: number; drawsRemaining: number; dailyDrawLimit: number; resetAt: string }>;
}

export class DailyCardDrawLimitError extends Error {
  constructor(readonly resetAt: string) {
    super('The daily card draw limit has been reached');
    this.name = 'DailyCardDrawLimitError';
  }
}

class CardCollectionApiError extends Error {
  constructor(readonly status: number, readonly code?: string, readonly resetAt?: string) {
    super(`Card collection API returned HTTP ${status}`);
    this.name = 'CardCollectionApiError';
  }
}

export function createApiCardCollectionRepository(apiUrl?: string, serviceToken?: string): CardCollectionRepository {
  const baseUrl = `${String(apiUrl || '').replace(/\/$/, '')}/api/bot920`;
  const request = async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    if (!apiUrl || !serviceToken) throw new Error('Card collection API is not configured');
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({})) as { code?: string; resetAt?: string };
      throw new CardCollectionApiError(response.status, errorPayload.code, errorPayload.resetAt);
    }
    return await response.json() as T;
  };

  return {
    async recordDrop(guildId, userId, card) {
      try {
        return await request<{ duplicate: boolean; quantity: number; drawsRemaining: number; resetAt: string }>(`/guilds/${guildId}/collection/draw`, 'POST', { userId, card });
      } catch (error) {
        if (error instanceof CardCollectionApiError && error.status === 429 && error.code === 'DAILY_DRAW_LIMIT' && error.resetAt) {
          throw new DailyCardDrawLimitError(error.resetAt);
        }
        throw error;
      }
    },
    async getCollection(guildId, userId) {
      const payload = await request<{
        cards: Array<{ cardId: string; cardName: string; rarity: RBECollectibleCard['rarity']; description: string; quantity: number; firstAcquired: string }>;
        uniqueCards: number;
        totalCards: number;
        drawsRemaining: number;
        dailyDrawLimit: number;
        resetAt: string;
      }>(`/guilds/${guildId}/collection/${userId}`);
      return {
        ...payload,
        cards: payload.cards.map((card) => ({ id: card.cardId, name: card.cardName, rarity: card.rarity, description: card.description, quantity: card.quantity, firstAcquired: card.firstAcquired })),
      };
    },
  };
}