import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BOT_PORT: z.coerce.number().int().min(1).max(65535).default(() => (
    Number(process.env.PORT) || 4300
  )),
  DISCORD_TOKEN: z.string().min(1).optional(),
  DISCORD_APPLICATION_ID: z.string().min(1).optional(),
  DISCORD_PUBLIC_KEY: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  RBE_API_URL: z.string().url().optional(),
  BOT920_SERVICE_TOKEN: z.string().min(32).optional(),
});

export const env = environmentSchema.parse(process.env);