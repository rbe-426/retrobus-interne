import type { Bot920Configuration } from '../config/bot920Configuration.js';

const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export interface WelcomeTemplateContext {
  userId: string;
  username: string;
  serverName: string;
  memberCount: number;
}

export function isDiscordSnowflake(value: string): boolean {
  return SNOWFLAKE_PATTERN.test(value);
}

export function isWelcomeEnabled(configuration: Bot920Configuration): boolean {
  const { welcome } = configuration;
  return welcome.welcomeEnabled
    && isDiscordSnowflake(welcome.welcomeChannelId)
    && welcome.welcomeMessage.trim().length > 0;
}

export function renderWelcomeMessage(template: string, context: WelcomeTemplateContext): string {
  const variables: Record<string, string> = {
    user: `<@${context.userId}>`,
    username: context.username,
    server: context.serverName,
    member_count: String(context.memberCount),
  };

  return template.replace(/\{(user|username|server|member_count)\}/g, (_match, variable: string) => variables[variable]);
}