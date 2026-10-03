import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from './types.js';
import { executeAbout } from './about.js';
import {
  formatBreakdown,
  formatBus,
  formatControl,
  formatDestiny,
  formatDiagnostic,
  formatDraw,
  formatPhrase,
} from './funContent.js';
import { executePing } from './ping.js';
import type { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';

export function createCommand920(birthdayInteractions: BirthdayInteractions): BotCommand {
  return {
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
      .setDescription('Consulte les informations d’anniversaire.'))
    .addSubcommand((subcommand) => subcommand
      .setName('phrase')
      .setDescription('Affiche une phrase RBE aléatoire.'))
    .addSubcommand((subcommand) => subcommand
      .setName('bus')
      .setDescription('Tire un bus RBE au sort.'))
    .addSubcommand((subcommand) => subcommand
      .setName('panne')
      .setDescription('Lance un diagnostic de panne humoristique.'))
    .addSubcommand((subcommand) => subcommand
      .setName('destin')
      .setDescription('Consulte le destin RBE du jour.'))
    .addSubcommand((subcommand) => subcommand
      .setName('controle')
      .setDescription('Passe un contrôle technique RBE humoristique.'))
    .addSubcommand((subcommand) => subcommand
      .setName('diagnostic')
      .setDescription('Lance un diagnostic RBE humoristique.')
      .addStringOption((option) => option
        .setName('symptome')
        .setDescription('Le symptôme observé.')
        .setRequired(true)
        .addChoices(
          { name: 'Bruit', value: 'bruit' },
          { name: 'Fumée', value: 'fumee' },
          { name: 'Fuite', value: 'fuite' },
          { name: 'Voyant', value: 'voyant' },
          { name: 'Perte de puissance', value: 'pertepuissance' },
        )))
    .addSubcommand((subcommand) => subcommand
      .setName('tirage')
      .setDescription('Lance un tirage RBE.')),
  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'ping':
        await executePing(interaction);
        return;
      case 'about':
        await executeAbout(interaction);
        return;
      case 'anniversaire':
        await birthdayInteractions.showMenu(interaction);
        return;
      case 'phrase':
        await interaction.reply(formatPhrase());
        return;
      case 'bus':
        await interaction.reply(formatBus());
        return;
      case 'panne':
        await interaction.reply(formatBreakdown());
        return;
      case 'destin':
        await interaction.reply(formatDestiny());
        return;
      case 'controle':
        await interaction.reply(formatControl());
        return;
      case 'diagnostic':
        await interaction.reply(formatDiagnostic(interaction.options.getString('symptome', true)));
        return;
      case 'tirage':
        await interaction.reply(formatDraw());
        return;
    }
  },
  };
}