import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import type { CommunityPoll, CommunityPollOption, CommunityRepository } from './communityRepository.js';
import { logger } from '../utils/logger.js';

function pollButtons(pollId: string, options: CommunityPollOption[], disabled = false): ActionRowBuilder<ButtonBuilder>[] {
  const buttons = options.map((option) => new ButtonBuilder()
    .setCustomId(`920:poll:${pollId}:${option.id}`)
    .setLabel(`${option.label}${option.votes == null ? '' : ` · ${option.votes}`}`.slice(0, 80))
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled));
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < buttons.length; index += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(index, index + 5)));
  }
  return rows;
}

function pollMessage(poll: CommunityPoll, final = false): string {
  const total = poll.options.reduce((count, option) => count + (option.votes ?? 0), 0);
  const results = final
    ? `\n\n**Résultats (${total} vote${total > 1 ? 's' : ''})**\n${poll.options.map((option) => `• ${option.label} : ${option.votes ?? 0}`).join('\n')}`
    : '';
  const deadline = poll.endsAt ? `\nClôture <t:${Math.floor(new Date(poll.endsAt).getTime() / 1_000)}:R>` : '';
  return `📊 **SONDAGE RBE**\n${poll.question}${final ? '' : deadline}${results}`;
}

export class CommunityInteractions {
  private readonly activityThrottle = new Map<string, number>();

  constructor(private readonly repository?: CommunityRepository) {}

  async showLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !this.repository) {
      await interaction.reply({ content: 'Le classement est indisponible pour le moment.', ephemeral: true });
      return;
    }
    const entries = await this.repository.leaderboard(interaction.guildId);
    const content = entries.length
      ? `🏆 **CLASSEMENT RBE**\n\n${entries.map((entry, index) => `${index + 1}. **${entry.displayName}** · ${entry.points} point${entry.points > 1 ? 's' : ''} · ${entry.active ? 'Actif' : 'Inactif'}`).join('\n')}\n\nUn point est attribué au maximum toutes les 15 minutes d’activité.`
      : '🏆 Aucun point d’activité enregistré pour le moment.';
    await interaction.reply({ content, ephemeral: false });
  }

  async createPoll(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.channelId || !this.repository) {
      await interaction.reply({ content: 'Les sondages sont indisponibles ici.', ephemeral: true });
      return;
    }
    const options = ['option1', 'option2', 'option3', 'option4', 'option5']
      .map((name) => interaction.options.getString(name))
      .filter((value): value is string => Boolean(value?.trim()));
    const poll = await this.repository.createPoll({
      guildId: interaction.guildId,
      creatorId: interaction.user.id,
      channelId: interaction.channelId,
      question: interaction.options.getString('question', true),
      options,
      durationMinutes: interaction.options.getInteger('duree') ?? 1_440,
    });
    await interaction.reply({ content: pollMessage(poll), components: pollButtons(poll.id, poll.options) });
    const message = await interaction.fetchReply();
    await this.repository.attachPollMessage(interaction.guildId, poll.id, message.id);
  }

  async createSuggestion(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !this.repository) {
      await interaction.reply({ content: 'Les suggestions sont indisponibles ici.', ephemeral: true });
      return;
    }
    const suggestion = await this.repository.createSuggestion(interaction.guildId, interaction.user.id, interaction.options.getString('idee', true));
    const button = new ButtonBuilder().setCustomId(`920:suggestion:${suggestion.id}`).setLabel('Soutenir').setStyle(ButtonStyle.Success);
    await interaction.reply({ content: `💡 **Suggestion RBE**\n${interaction.options.getString('idee', true)}\n\nProposée par ${interaction.user}.`, components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
  }

  async recordActivity(guildId: string, userId: string, displayName: string): Promise<void> {
    if (!this.repository) return;
    const key = `${guildId}:${userId}`;
    if (Date.now() - (this.activityThrottle.get(key) ?? 0) < 60_000) return;
    this.activityThrottle.set(key, Date.now());
    try {
      await this.repository.recordActivity(guildId, userId, displayName);
    } catch (error) {
      logger.warn('community', `Activité non enregistrée (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
    }
  }

  async handleButton(interaction: ButtonInteraction): Promise<boolean> {
    if (!this.repository || !interaction.guildId) return false;
    const pollMatch = interaction.customId.match(/^920:poll:([^:]+):([^:]+)$/);
    if (pollMatch) {
      try {
        const options = await this.repository.votePoll(interaction.guildId, pollMatch[1], pollMatch[2], interaction.user.id);
        await interaction.update({ components: pollButtons(pollMatch[1], options) });
      } catch {
        const poll = await this.repository.getPoll(interaction.guildId, pollMatch[1]).catch(() => null);
        if (poll) await interaction.update({ content: pollMessage(poll, true), components: pollButtons(poll.id, poll.options, true) });
        else await interaction.reply({ content: 'Ce sondage est clôturé ou indisponible.', ephemeral: true });
      }
      return true;
    }

    const suggestionMatch = interaction.customId.match(/^920:suggestion:([^:]+)$/);
    if (suggestionMatch) {
      try {
        const result = await this.repository.voteSuggestion(interaction.guildId, suggestionMatch[1], interaction.user.id);
        const button = new ButtonBuilder()
          .setCustomId(interaction.customId)
          .setLabel(`${result.voted ? 'Soutenu' : 'Soutenir'} · ${result.votes}`.slice(0, 80))
          .setStyle(result.voted ? ButtonStyle.Success : ButtonStyle.Secondary);
        await interaction.update({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
      } catch {
        await interaction.reply({ content: 'Le vote n’a pas pu être enregistré.', ephemeral: true });
      }
      return true;
    }
    return false;
  }

  async closeDuePolls(client: Client): Promise<void> {
    if (!this.repository) return;
    try {
      const polls = await this.repository.duePolls();
      for (const entry of polls) {
        const guild = client.guilds.cache.get(entry.guildId);
        const channel = guild?.channels.cache.get(entry.channelId);
        if (!channel?.isTextBased()) continue;
        const message = await channel.messages.fetch(entry.messageId).catch(() => null);
        if (!message) continue;
        const poll = await this.repository.getPoll(entry.guildId, entry.id);
        await message.edit({ content: pollMessage(poll, true), components: pollButtons(poll.id, poll.options, true) });
      }
    } catch (error) {
      logger.warn('community', `Clôture des sondages indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
    }
  }
}