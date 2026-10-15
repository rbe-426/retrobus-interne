import type { RBECollectibleCard } from '../commands/funContent.js';

export interface OwnedCollectibleCard extends RBECollectibleCard {
  quantity: number;
  firstAcquired: string;
}

export interface CardCollectionRepository {
  recordDrop(guildId: string, userId: string, card: RBECollectibleCard): Promise<{ quantity: number }>;
  getCollection(guildId: string, userId: string): Promise<{ cards: OwnedCollectibleCard[]; uniqueCards: number; totalCards: number }>;
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  };

  return {
    async recordDrop(guildId, userId, card) {
      return await request(`/guilds/${guildId}/collection/draw`, 'POST', { userId, card });
    },
    async getCollection(guildId, userId) {
      const payload = await request<{
        cards: Array<{ cardId: string; cardName: string; rarity: RBECollectibleCard['rarity']; description: string; quantity: number; firstAcquired: string }>;
        uniqueCards: number;
        totalCards: number;
      }>(`/guilds/${guildId}/collection/${userId}`);
      return {
        ...payload,
        cards: payload.cards.map((card) => ({ id: card.cardId, name: card.cardName, rarity: card.rarity, description: card.description, quantity: card.quantity, firstAcquired: card.firstAcquired })),
      };
    },
  };
}