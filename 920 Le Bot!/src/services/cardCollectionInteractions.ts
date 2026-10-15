import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { CARD_RARITIES, RBE_CARD_CATALOG, type CardRarity } from '../commands/funContent.js';
import type { CardCollectionRepository, OwnedCollectibleCard } from './cardCollectionRepository.js';

const RARITY_ORDER: readonly CardRarity[] = ['MYTHIQUE', 'LEGENDAIRE', 'EPIQUE', 'RARE', 'COMMUN'];
const RARITY_COLORS: Record<CardRarity, number> = {
  COMMUN: 0x95a5a6,
  RARE: 0x3498db,
  EPIQUE: 0x9b59b6,
  LEGENDAIRE: 0xe67e22,
  MYTHIQUE: 0xf1c40f,
};

export function buildCollectionEmbed(
  username: string,
  cards: OwnedCollectibleCard[],
  totalCards: number,
): EmbedBuilder {
  const ownedByRarity = new Map<CardRarity, OwnedCollectibleCard[]>();
  for (const card of cards) {
    const group = ownedByRarity.get(card.rarity) ?? [];
    group.push(card);
    ownedByRarity.set(card.rarity, group);
  }

  const embed = new EmbedBuilder()
    .setColor(0x176b87)
    .setTitle(`📖 Pokédex RBE · ${username}`)
    .setDescription(`${cards.length}/${RBE_CARD_CATALOG.length} cartes découvertes · ${totalCards} exemplaire${totalCards > 1 ? 's' : ''} possédé${totalCards > 1 ? 's' : ''}`);

  for (const rarityName of RARITY_ORDER) {
    const rarity = CARD_RARITIES[rarityName];
    const owned = (ownedByRarity.get(rarityName) ?? []).sort((left, right) => left.name.localeCompare(right.name));
    const cardLines = owned.length
      ? owned.map((card) => `• **${card.name}**${card.quantity > 1 ? ` ×${card.quantity}` : ''}`).join('\n')
      : 'Aucune pour le moment.';
    embed.addFields({
      name: `${rarity.icon} ${rarity.label} · ${rarity.chance} %`,
      value: cardLines,
      inline: false,
    });
  }
  embed.setFooter({ text: cards.length ? 'Choisis une carte dans la liste pour afficher son détail.' : 'Lance /920 tirage pour commencer ta collection.' });
  return embed;
}

export function buildCardDetailEmbed(card: OwnedCollectibleCard): EmbedBuilder {
  const rarity = CARD_RARITIES[card.rarity];
  return new EmbedBuilder()
    .setColor(RARITY_COLORS[card.rarity])
    .setTitle(`${rarity.icon} ${card.name}`)
    .setDescription(card.description)
    .addFields(
      { name: 'Rareté', value: `${rarity.label} · ${rarity.chance} %`, inline: true },
      { name: 'Exemplaires', value: String(card.quantity), inline: true },
      { name: 'Première obtention', value: new Date(card.firstAcquired).toLocaleDateString('fr-FR'), inline: true },
    )
    .setFooter({ text: 'Collection de cartes RétroBus Essonne' });
}

export function buildCollectionComponents(userId: string, cards: OwnedCollectibleCard[]) {
  if (!cards.length) return [];
  const selector = new StringSelectMenuBuilder()
    .setCustomId(`920:card-detail:${userId}`)
    .setPlaceholder('Choisir une carte pour voir son détail')
    .addOptions(cards.slice(0, 25).map((card) => ({
      label: `${CARD_RARITIES[card.rarity].label} · ${card.name}`.slice(0, 100),
      description: `${card.quantity} exemplaire${card.quantity > 1 ? 's' : ''} · ${card.description}`.slice(0, 100),
      value: card.id,
    })));
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selector)];
}

export class CardCollectionInteractions {
  constructor(private readonly repository?: CardCollectionRepository) {}

  async showCollection(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !this.repository) {
      await interaction.reply({ content: 'Le Pokédex est indisponible pour le moment.', ephemeral: true });
      return;
    }
    try {
      const target = interaction.options.getUser('membre') ?? interaction.user;
      const collection = await this.repository.getCollection(interaction.guildId, target.id);
      const components = buildCollectionComponents(target.id, collection.cards);
      await interaction.reply({
        embeds: [buildCollectionEmbed(target.username, collection.cards, collection.totalCards)],
        components,
        ephemeral: target.id === interaction.user.id,
      });
    } catch {
      await interaction.reply({ content: 'Impossible de charger ce Pokédex pour le moment.', ephemeral: true });
    }
  }

  async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<boolean> {
    const match = interaction.customId.match(/^920:card-detail:(\d{17,20})$/);
    if (!match) return false;
    if (!interaction.guildId || !this.repository) {
      await interaction.reply({ content: 'Le détail de cette carte est indisponible.', ephemeral: true });
      return true;
    }
    try {
      const collection = await this.repository.getCollection(interaction.guildId, match[1]);
      const card = collection.cards.find((entry) => entry.id === interaction.values[0]);
      if (!card) {
        await interaction.reply({ content: 'Cette carte ne figure plus dans cette collection.', ephemeral: true });
        return true;
      }
      await interaction.reply({ embeds: [buildCardDetailEmbed(card)], ephemeral: true });
    } catch {
      await interaction.reply({ content: 'Impossible de charger le détail de cette carte.', ephemeral: true });
    }
    return true;
  }
}
