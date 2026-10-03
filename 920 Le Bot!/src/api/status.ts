export interface BotStatus {
  status: 'ok';
  service: '920-le-bot';
  startedAt: string;
  discord: 'connected' | 'standby';
  commandCount: number;
  latencyMs: number | null;
  guildCount: number;
}

export function buildBotStatus(
  startedAt: string,
  discordConnected: boolean,
  commandCount: number,
  latencyMs: number | null,
  guildCount: number,
): BotStatus {
  return {
    status: 'ok',
    service: '920-le-bot',
    startedAt,
    discord: discordConnected ? 'connected' : 'standby',
    commandCount,
    latencyMs,
    guildCount,
  };
}