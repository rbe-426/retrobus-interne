import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BOT_PORT: z.coerce.number().int().min(1).max(65535).default(4300),
  DISCORD_TOKEN: z.string().min(1).optional(),
  DISCORD_APPLICATION_ID: z.string().min(1).optional(),
  DISCORD_PUBLIC_KEY: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  BOT_DATABASE_URL: z.string().url().optional(),
});

export const env = environmentSchema.parse(process.env);