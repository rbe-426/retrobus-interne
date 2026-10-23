import type { BotCommand } from './types.js';
import { createCommand920 } from './920.js';
import type { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';
import { defaultBot920Configuration, type Bot920Configuration } from '../config/bot920Configuration.js';
import { ModerationService } from '../services/moderation.js';
import type { ReleaseNote } from '../commands/updateLog.js';
import type { CardCollectionRepository } from '../services/cardCollectionRepository.js';
import type { CardCollectionInteractions } from '../services/cardCollectionInteractions.js';
import type { ModeratorRoleManagement } from '../services/moderatorRoleManagement.js';
import type { Bot920FeedbackRepository } from '../services/feedbackRepository.js';

export function createCommands(
  birthdayInteractions: BirthdayInteractions,
  getConfiguration: (guildId?: string) => Bot920Configuration = () => defaultBot920Configuration,
  moderation?: ModerationService,
  getReleaseNotes?: () => Promise<ReleaseNote[]>,
  cardCollection?: CardCollectionRepository,
  collectionInteractions?: CardCollectionInteractions,
  moderatorRoleManagement?: ModeratorRoleManagement,
  feedbackRepository?: Bot920FeedbackRepository,
): readonly BotCommand[] {
	return [createCommand920(birthdayInteractions, getConfiguration, moderation, getReleaseNotes, cardCollection, collectionInteractions, moderatorRoleManagement, feedbackRepository)];
}