import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { ModeratorRoleRepository } from './moderatorRoleRepository.js';

function canManageModeratorRoles(interaction: ChatInputCommandInteraction): boolean {
  return interaction.guild?.ownerId === interaction.user.id
    || (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false);
}

export class ModeratorRoleManagement {
  constructor(private readonly repository?: ModeratorRoleRepository) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (interaction.options.getSubcommandGroup(false) !== 'admin') return false;
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: 'La gestion des rôles modérateurs est disponible uniquement sur un serveur.', ephemeral: true });
      return true;
    }
    if (!canManageModeratorRoles(interaction)) {
      await interaction.reply({ content: 'Seuls le propriétaire du serveur et les membres ayant la permission Administrateur peuvent gérer les rôles modérateurs.', ephemeral: true });
      return true;
    }
    if (!this.repository) {
      await interaction.reply({ content: 'Le stockage des rôles modérateurs est indisponible.', ephemeral: true });
      return true;
    }

    const action = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    try {
      if (action === 'moderateurs') {
        const roles = await this.repository.list(interaction.guildId);
        const content = roles.length
          ? `🛡️ **Rôles modérateurs configurés**\n${roles.map((role) => `• <@&${role.roleId}>`).join('\n')}`
          : 'Aucun rôle modérateur configuré. Les administrateurs et le propriétaire gardent toujours accès aux commandes.';
        await interaction.editReply(content);
        return true;
      }

      const role = interaction.options.getRole('role', true);
      if (role.id === interaction.guildId || role.managed) {
        await interaction.editReply('Ce rôle ne peut pas être configuré comme rôle modérateur.');
        return true;
      }
      const actor = await interaction.guild.members.fetch(interaction.user.id);
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      if (!isOwner && role.position >= actor.roles.highest.position) {
        await interaction.editReply('Tu ne peux gérer que les rôles situés sous ton rôle le plus élevé.');
        return true;
      }

      if (action === 'ajouter-role') {
        await this.repository.add(interaction.guildId, role.id, interaction.user.id, interaction.user.username);
        await interaction.editReply(`✅ <@&${role.id}> peut maintenant utiliser les commandes de modération.`);
        return true;
      }
      if (action === 'retirer-role') {
        await this.repository.remove(interaction.guildId, role.id, interaction.user.id, interaction.user.username);
        await interaction.editReply(`✅ <@&${role.id}> ne peut plus utiliser les commandes de modération.`);
        return true;
      }
    } catch {
      if (interaction.deferred || interaction.replied) await interaction.editReply('Impossible de modifier les rôles modérateurs. Vérifie que le bot est synchronisé et réessaie.');
      else await interaction.reply({ content: 'Impossible de modifier les rôles modérateurs. Vérifie que le bot est synchronisé et réessaie.', ephemeral: true });
      return true;
    }
    return true;
  }
}
