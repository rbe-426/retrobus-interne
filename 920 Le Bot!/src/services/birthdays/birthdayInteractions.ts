import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
} from 'discord.js';
import type { BirthdayRepository } from './birthdayRepositoryTypes.js';
import { formatBirthdayDate, getAge, parseBirthdayDate } from './birthdayDate.js';

const CONSULT_BUTTON_ID = 'birthday:consult';
const EDIT_BUTTON_ID = 'birthday:edit';
const EDIT_MODAL_ID = 'birthday:edit-modal';
const BIRTHDAY_INPUT_ID = 'birthday:date';

function unavailableMessage(): InteractionReplyOptions {
  return { content: 'Le module anniversaires n’est pas encore configuré sur le serveur.', flags: MessageFlags.Ephemeral };
}

function formatBirthdayList(records: readonly Awaited<ReturnType<BirthdayRepository['listByGuild']>>[number][]): string {
  if (records.length === 0) return '🎂 Aucun anniversaire n’est encore enregistré sur ce serveur.';

  const visibleRecords = records.slice(0, 30);
  const lines = visibleRecords.map((record) => (
    `• **${record.displayName}** — ${getAge(record.birthDate)} ans (${formatBirthdayDate(record.birthDate)})`
  ));
  const overflow = records.length > visibleRecords.length
    ? `\n\n… et ${records.length - visibleRecords.length} autre(s) anniversaire(s).`
    : '';

  return `🎂 **Anniversaires RBE**\n\n${lines.join('\n')}${overflow}`;
}

export class BirthdayInteractions {
  constructor(private readonly repository?: BirthdayRepository) {}

  async showMenu(interaction: { reply: (options: object) => Promise<unknown> }) {
    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CONSULT_BUTTON_ID).setLabel('Consulter').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(EDIT_BUTTON_ID).setLabel('Éditer mon anniversaire').setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      content: '🎂 Souhaitez-vous consulter la liste ou éditer votre anniversaire ?',
      components: [actions],
      flags: MessageFlags.Ephemeral,
    });
  }

  async handleButton(interaction: ButtonInteraction): Promise<boolean> {
    if (![CONSULT_BUTTON_ID, EDIT_BUTTON_ID].includes(interaction.customId)) return false;
    if (!interaction.guildId || !this.repository) {
      await interaction.reply(unavailableMessage());
      return true;
    }

    if (interaction.customId === CONSULT_BUTTON_ID) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const records = await this.repository.listByGuild(interaction.guildId);
        await interaction.editReply({ content: formatBirthdayList(records) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Le service anniversaires RBE est indisponible.';
        await interaction.editReply({ content: `⚠️ ${message}` });
      }
      return true;
    }

    const input = new TextInputBuilder()
      .setCustomId(BIRTHDAY_INPUT_ID)
      .setLabel('Date de naissance (JJ/MM/AAAA)')
      .setPlaceholder('Exemple : 04/10/2000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);
    const modal = new ModalBuilder()
      .setCustomId(EDIT_MODAL_ID)
      .setTitle('Mon anniversaire RBE')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return true;
  }

  async handleModal(interaction: ModalSubmitInteraction): Promise<boolean> {
    if (interaction.customId !== EDIT_MODAL_ID) return false;
    if (!interaction.guildId || !this.repository) {
      await interaction.reply(unavailableMessage());
      return true;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const birthDate = parseBirthdayDate(interaction.fields.getTextInputValue(BIRTHDAY_INPUT_ID));
      await this.repository.upsert({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        displayName: interaction.user.globalName ?? interaction.user.username,
        birthDate,
      });
      await interaction.editReply(`🎂 Anniversaire enregistré : ${formatBirthdayDate(birthDate)} (${getAge(birthDate)} ans).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’enregistrer cet anniversaire.';
      if (interaction.deferred || interaction.replied) await interaction.editReply(`⚠️ ${message}`);
      else await interaction.reply({ content: `⚠️ ${message}`, flags: MessageFlags.Ephemeral });
    }
    return true;
  }
}