import type { BotCommand } from './types.js';
import { createCommand920 } from './920.js';
import type { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';

export function createCommands(birthdayInteractions: BirthdayInteractions): readonly BotCommand[] {
	return [createCommand920(birthdayInteractions)];
}