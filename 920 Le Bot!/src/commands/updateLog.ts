import { logger } from '../utils/logger.js';

export interface ReleaseNote {
  version: string;
  title: string;
  date: string;
  changes: string[];
}

interface ReleaseNoteResponse {
  updates?: ReleaseNote[];
}

export function createApiUpdateLogRepository(apiUrl?: string, serviceToken?: string): () => Promise<ReleaseNote[]> {
  return async () => {
    if (!apiUrl || !serviceToken) return [];
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/bot920/updates`, {
        headers: { 'x-bot920-service-token': serviceToken },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as ReleaseNoteResponse;
      return Array.isArray(payload.updates) ? payload.updates : [];
    } catch (error) {
      logger.warn('updatelog', `Changelog indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
      return [];
    }
  };
}