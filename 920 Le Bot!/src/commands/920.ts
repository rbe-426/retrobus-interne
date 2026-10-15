import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import type { BotCommand } from './types.js';
import { executeAbout } from './about.js';
import {
  formatBreakdown,
  formatBus,
  formatControl,
  formatDestiny,
  formatDiagnostic,
  formatHelp,
  formatPhrase,
  drawCollectibleCard,
  formatCollectibleCard,
  CARD_RARITIES,
  RBE_CARD_CATALOG,
} from './funContent.js';
import { executePing } from './ping.js';
import { formatMusicSuggestion, type MusicStyle } from './musicSuggestion.js';
import type { ReleaseNote } from './updateLog.js';
import type { BirthdayInteractions } from '../services/birthdays/birthdayInteractions.js';
import type { CardCollectionRepository } from '../services/cardCollectionRepository.js';
import { isBot920CommandEnabled, type Bot920Configuration, type Bot920Subcommand } from '../config/bot920Configuration.js';
import { ModerationService } from '../services/moderation.js';

function withMemberAndReason(configure: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder) {
  return (builder: SlashCommandSubcommandBuilder) => configure(builder
    .addUserOption((option) => option.setName('membre').setDescription('Le membre ciblé.').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif de la modération.').setMaxLength(400)));
}

function withMemberDurationAndReason(configure: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder) {
  return (builder: SlashCommandSubcommandBuilder) => configure(builder
    .addUserOption((option) => option.setName('membre').setDescription('Le membre ciblé.').setRequired(true))
    .addIntegerOption((option) => option.setName('duree').setDescription('Durée en minutes.').setRequired(true).setMinValue(1))
    .addStringOption((option) => option.setName('raison').setDescription('Motif de la modération.').setMaxLength(400)));
}

export function createCommand920(
  birthdayInteractions: BirthdayInteractions,
  getConfiguration: (guildId?: string) => Bot920Configuration,
  moderation = new ModerationService(),
  getReleaseNotes: () => Promise<ReleaseNote[]> = async () => [],
  cardCollection?: CardCollectionRepository,
): BotCommand {
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
      .setName('help')
      .setDescription('Affiche les commandes classées par catégorie.'))
    .addSubcommand((subcommand) => subcommand
      .setName('updatelog')
      .setDescription('Affiche les dernières nouveautés du bot.'))
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
      .setDescription('Lance un tirage RBE.'))
    .addSubcommand((subcommand) => subcommand
      .setName('collection')
      .setDescription('Consulte ton Pokédex de cartes RBE.')
      .addUserOption((option) => option.setName('membre').setDescription('Collection à consulter.').setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName('ecouter')
      .setDescription('Suggère une musique selon une ambiance.')
      .addStringOption((option) => option
        .setName('ambiance')
        .setDescription('Style musical souhaité, ou laisse le bot te surprendre.')
        .setRequired(true)
        .addChoices(
          { name: 'Rap', value: 'rap' },
          { name: 'Rock', value: 'rock' },
          { name: 'Électro', value: 'electro' },
          { name: 'Pop', value: 'pop' },
          { name: 'Surprends-moi', value: 'surprends_moi' },
        )))
    .addSubcommand(withMemberAndReason((subcommand) => subcommand.setName('kick').setDescription('Expulse un membre du serveur.')))
    .addSubcommand(withMemberDurationAndReason((subcommand) => subcommand.setName('mute').setDescription('Empêche temporairement un membre de parler.')))
    .addSubcommand(withMemberAndReason((subcommand) => subcommand.setName('unmute').setDescription('Retire le mute d’un membre.')))
    .addSubcommand(withMemberAndReason((subcommand) => subcommand.setName('ban').setDescription('Bannit un membre du serveur.')))
    .addSubcommand(withMemberDurationAndReason((subcommand) => subcommand.setName('tempban').setDescription('Bannit temporairement un membre.')))
    .addSubcommand(withMemberAndReason((subcommand) => subcommand.setName('unban').setDescription('Retire le bannissement d’un utilisateur.'))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand() as Bot920Subcommand;
    const configuration = getConfiguration(interaction.guildId ?? undefined);
    if (!isBot920CommandEnabled(configuration, subcommand)) {
      await interaction.reply({ content: 'Cette commande est temporairement désactivée par l’administration.', ephemeral: true });
      return;
    }

    if (await moderation.handle(interaction)) return;

    switch (subcommand) {
      case 'ping':
        await executePing(interaction);
        return;
      case 'about':
        await executeAbout(interaction, configuration);
        return;
      case 'help':
        await interaction.reply({ content: formatHelp(), ephemeral: true });
        return;
      case 'updatelog': {
        const updates = await getReleaseNotes();
        const content = updates.length
          ? `📝 **920 LE BOT — UPDATELOG**\n\n${updates.map((update) => `**${update.version} · ${update.title}**\n${update.date}\n${update.changes.map((change) => `• ${change}`).join('\n')}`).join('\n\n')}`
          : '📝 Aucun changelog du bot n’est publié pour le moment.';
        await interaction.reply({ content: content.slice(0, 2_000), ephemeral: true });
        return;
      }
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
        if (!interaction.guildId || !cardCollection) {
          await interaction.reply({ content: 'Le Pokédex est indisponible : aucun tirage ne sera perdu.', ephemeral: true });
          return;
        }
        {
          const card = drawCollectibleCard();
          try {
            const owned = await cardCollection.recordDrop(interaction.guildId, interaction.user.id, card);
            const duplicateText = owned.quantity > 1 ? `\n\n📚 Tu possèdes maintenant **${owned.quantity} exemplaires** de cette carte.` : '\n\n📚 Première carte ajoutée à ton Pokédex !';
            await interaction.reply(`${formatCollectibleCard(card)}${duplicateText}`);
          } catch {
            await interaction.reply({ content: 'Le tirage n’a pas été effectué : la sauvegarde de collection est momentanément indisponible. Réessaie dans un instant.', ephemeral: true });
          }
        }
        return;
      case 'collection':
        if (!interaction.guildId || !cardCollection) {
          await interaction.reply({ content: 'Le Pokédex est indisponible pour le moment.', ephemeral: true });
          return;
        }
        try {
          const target = interaction.options.getUser('membre') ?? interaction.user;
          const collection = await cardCollection.getCollection(interaction.guildId, target.id);
          const rarityOrder = ['MYTHIQUE', 'LEGENDAIRE', 'EPIQUE', 'RARE', 'COMMUN'] as const;
          const cards = collection.cards.sort((left, right) => rarityOrder.indexOf(left.rarity) - rarityOrder.indexOf(right.rarity) || left.name.localeCompare(right.name));
          const lines = cards.map((card) => {
            const rarity = CARD_RARITIES[card.rarity];
            return `${rarity.icon} **${card.name}** · ${rarity.label}${card.quantity > 1 ? ` ×${card.quantity}` : ''}`;
          });
          const content = `📖 **POKÉDEX RBE · ${target.username}**\n${collection.uniqueCards}/${RBE_CARD_CATALOG.length} cartes découvertes · ${collection.totalCards} tirages possédés\n\n${lines.length ? lines.join('\n') : 'Aucune carte pour le moment. Lance `/920 tirage` pour commencer !'}`;
          await interaction.reply({ content: content.slice(0, 2_000), ephemeral: target.id === interaction.user.id });
        } catch {
          await interaction.reply({ content: 'Impossible de charger ce Pokédex pour le moment.', ephemeral: true });
        }
        return;
      case 'ecouter':
        await interaction.reply(formatMusicSuggestion((interaction.options.getString('ambiance') ?? 'surprends_moi') as MusicStyle));
        return;
    }
  },
  };
}