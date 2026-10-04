import type { BotCommand } from './types.js';
import { createCommand920 } from './920.js';
import type { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';
import { defaultBot920Configuration, type Bot920Configuration } from '../config/bot920Configuration.js';
import { ModerationService } from '../services/moderation.js';

export function createCommands(
  birthdayInteractions: BirthdayInteractions,
  getConfiguration: () => Bot920Configuration = () => defaultBot920Configuration,
  moderation?: ModerationService,
): readonly BotCommand[] {
	return [createCommand920(birthdayInteractions, getConfiguration, moderation)];
}