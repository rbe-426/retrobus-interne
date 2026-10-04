import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction, type Client, type GuildMember, type User } from 'discord.js';
import type { TemporaryBanRepository } from './temporaryBanRepository.js';
import type { ModerationCaseRepository } from './moderationCaseRepository.js';
import { logger } from '../utils/logger.js';

const MAX_TIMEOUT_MINUTES = 40_320;
const MAX_TEMPBAN_MINUTES = 43_200;

type ModerationAction = 'kick' | 'mute' | 'unmute' | 'ban' | 'tempban' | 'unban';

function hasPermission(interaction: ChatInputCommandInteraction, action: ModerationAction): boolean {
  const permission = action === 'kick'
    ? PermissionFlagsBits.KickMembers
    : action === 'mute' || action === 'unmute'
      ? PermissionFlagsBits.ModerateMembers
      : PermissionFlagsBits.BanMembers;
  return interaction.memberPermissions?.has(permission) ?? false;
}

function actionLabel(action: ModerationAction): string {
  return ({ kick: 'expulser', mute: 'rendre muet', unmute: 'retirer le mute de', ban: 'bannir', tempban: 'bannir temporairement', unban: 'débannir' })[action];
}

function reason(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString('raison')?.trim() || 'Aucun motif précisé.';
}

async function fetchMember(interaction: ChatInputCommandInteraction, user: User): Promise<GuildMember | null> {
  return interaction.guild?.members.fetch(user.id).catch(() => null) ?? null;
}

async function canActOnMember(interaction: ChatInputCommandInteraction, member: GuildMember): Promise<boolean> {
  const moderator = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
  if (!moderator || interaction.guild?.ownerId === member.id) return false;
  return interaction.guild?.ownerId === moderator.id
    || moderator.roles.highest.comparePositionTo(member.roles.highest) > 0;
}

export class ModerationService {
  constructor(private readonly temporaryBans?: TemporaryBanRepository, private readonly cases?: ModerationCaseRepository) {}

  private async record(interaction: ChatInputCommandInteraction, user: User, action: ModerationAction, auditReason: string, durationMinutes?: number, expiresAt?: Date): Promise<void> {
    try {
      await this.cases?.create({ guildId: interaction.guildId!, targetUserId: user.id, targetTag: user.tag, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, action, reason: auditReason, durationMinutes, expiresAt });
    } catch (error) {
      logger.warn('moderation', `Historique indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
    }
  }

  async handle(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const action = interaction.options.getSubcommand() as ModerationAction;
    if (!['kick', 'mute', 'unmute', 'ban', 'tempban', 'unban'].includes(action)) return false;

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: 'Cette commande est disponible uniquement sur un serveur Discord.', flags: MessageFlags.Ephemeral });
      return true;
    }
    if (!hasPermission(interaction, action)) {
      await interaction.reply({ content: `Vous n’avez pas la permission Discord requise pour ${actionLabel(action)} un membre.`, flags: MessageFlags.Ephemeral });
      return true;
    }

    const user = interaction.options.getUser('membre', true);
    if (user.id === interaction.user.id || user.id === interaction.client.user?.id) {
      await interaction.reply({ content: 'Cette action ne peut pas cibler votre compte ni celui du bot.', flags: MessageFlags.Ephemeral });
      return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const auditReason = reason(interaction);
    const member = await fetchMember(interaction, user);

    try {
      if (action === 'unban') {
        await interaction.guild.bans.remove(user.id, auditReason);
        await this.temporaryBans?.cancel(interaction.guild.id, user.id);
        await this.record(interaction, user, action, auditReason);
        await interaction.editReply(`✅ ${user.tag} a été débanni.`);
        return true;
      }

      if (action === 'ban' || action === 'tempban') {
        if (member && (!(await canActOnMember(interaction, member)) || !member.bannable)) {
          await interaction.editReply('⚠️ Ce membre ne peut pas être banni : hiérarchie de rôles ou permissions du bot insuffisantes.');
          return true;
        }

        if (action === 'tempban') {
          if (!this.temporaryBans) {
            await interaction.editReply('⚠️ Les bans temporaires ne sont pas encore disponibles : le stockage RBE est indisponible.');
            return true;
          }
          const minutes = interaction.options.getInteger('duree', true);
          if (minutes < 1 || minutes > MAX_TEMPBAN_MINUTES) {
            await interaction.editReply(`⚠️ La durée doit être comprise entre 1 et ${MAX_TEMPBAN_MINUTES} minutes.`);
            return true;
          }
          const expiresAt = new Date(Date.now() + minutes * 60_000);
          await this.temporaryBans.schedule({ guildId: interaction.guild.id, userId: user.id, expiresAt, reason: auditReason, moderatorId: interaction.user.id });
          try {
            await interaction.guild.members.ban(user.id, { reason: auditReason, deleteMessageSeconds: 0 });
          } catch (error) {
            await this.temporaryBans.cancel(interaction.guild.id, user.id);
            throw error;
          }
          await this.record(interaction, user, action, auditReason, minutes, expiresAt);
          await interaction.editReply(`✅ ${user.tag} a été banni jusqu’au <t:${Math.floor(expiresAt.getTime() / 1_000)}:f>.`);
          return true;
        }

        await interaction.guild.members.ban(user.id, { reason: auditReason, deleteMessageSeconds: 0 });
        await this.record(interaction, user, action, auditReason);
        await interaction.editReply(`✅ ${user.tag} a été banni.`);
        return true;
      }

      if (!member || !(await canActOnMember(interaction, member))) {
        await interaction.editReply('⚠️ Ce membre est introuvable ou sa position ne permet pas cette action.');
        return true;
      }

      if (action === 'kick') {
        if (!member.kickable) {
          await interaction.editReply('⚠️ Le bot ne peut pas expulser ce membre.');
          return true;
        }
        await member.kick(auditReason);
        await this.record(interaction, user, action, auditReason);
        await interaction.editReply(`✅ ${user.tag} a été expulsé.`);
        return true;
      }

      if (!member.moderatable) {
        await interaction.editReply('⚠️ Le bot ne peut pas modifier le mute de ce membre.');
        return true;
      }
      if (action === 'unmute') {
        await member.timeout(null, auditReason);
        await this.record(interaction, user, action, auditReason);
        await interaction.editReply(`✅ Le mute de ${user.tag} a été retiré.`);
        return true;
      }

      const minutes = interaction.options.getInteger('duree', true);
      if (minutes < 1 || minutes > MAX_TIMEOUT_MINUTES) {
        await interaction.editReply(`⚠️ La durée doit être comprise entre 1 et ${MAX_TIMEOUT_MINUTES} minutes.`);
        return true;
      }
      await member.timeout(minutes * 60_000, auditReason);
      await this.record(interaction, user, action, auditReason, minutes, new Date(Date.now() + minutes * 60_000));
      await interaction.editReply(`✅ ${user.tag} est muet jusqu’au <t:${Math.floor((Date.now() + minutes * 60_000) / 1_000)}:f>.`);
    } catch {
      await interaction.editReply(`⚠️ Impossible d’${actionLabel(action)} ce membre. Vérifiez les permissions et la hiérarchie des rôles du bot.`);
    }
    return true;
  }

  async processDueTemporaryBans(client: Client): Promise<void> {
    if (!this.temporaryBans) return;

    let bans: readonly import('./temporaryBanRepository.js').DueTemporaryBan[];
    try {
      bans = await this.temporaryBans.listDue();
    } catch (error) {
      logger.warn('moderation', `Levée automatique des tempbans indisponible (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
      return;
    }

    for (const ban of bans) {
      try {
        const guild = await client.guilds.fetch(ban.guildId);
        await guild.bans.remove(ban.userId, 'Fin du bannissement temporaire RBE.');
        await this.temporaryBans.complete(ban.id);
      } catch {
        // Keep the record pending so a transient Discord or network error is retried.
      }
    }
  }
}