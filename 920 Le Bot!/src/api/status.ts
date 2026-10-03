export interface BotStatus {
  status: 'ok';
  service: '920-le-bot';
  startedAt: string;
  discord: 'connected' | 'standby';
  commandCount: number;
}

export function buildBotStatus(startedAt: string, discordConnected: boolean, commandCount: number): BotStatus {
  return {
    status: 'ok',
    service: '920-le-bot',
    startedAt,
    discord: discordConnected ? 'connected' : 'standby',
    commandCount,
  };
}