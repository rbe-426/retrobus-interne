import express from 'express';
import { buildBotStatus } from './status.js';

interface HealthDependencies {
  startedAt: string;
  commandCount: number;
  isDiscordConnected: () => boolean;
}

export function createApiServer(dependencies: HealthDependencies) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_request, response) => {
    response.json(buildBotStatus(
      dependencies.startedAt,
      dependencies.isDiscordConnected(),
      dependencies.commandCount,
    ));
  });

  return app;
}