import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from './types.js';
import { executeAbout } from './about.js';
import { executePing } from './ping.js';

export const command920: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('920')
    .setDescription('Commandes officielles de RétroBus Essonne.')
    .addSubcommand((subcommand) => subcommand
      .setName('ping')
      .setDescription('Vérifie que 920 Le Bot ! est opérationnel.'))
    .addSubcommand((subcommand) => subcommand
      .setName('about')
      .setDescription('Présente 920 Le Bot !'))
    .addSubcommand((subcommand) => subcommand
      .setName('anniversaire')
      .setDescription('Consulte les informations d’anniversaire.')),
  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'ping':
        await executePing(interaction);
        return;
      case 'about':
        await executeAbout(interaction);
        return;
      case 'anniversaire':
        await interaction.reply({
          content: 'La gestion des anniversaires sera prochainement disponible.',
          ephemeral: true,
        });
        return;
    }
  },
};