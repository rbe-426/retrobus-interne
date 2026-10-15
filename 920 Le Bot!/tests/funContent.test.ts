import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RBE_PHRASES,
  formatBreakdown,
  formatBus,
  formatControl,
  formatDestiny,
  formatDiagnostic,
  formatDraw,
  drawCollectibleCard,
  CARD_RARITIES,
  RBE_CARD_CATALOG,
  formatHelp,
  formatPhrase,
} from '../src/commands/funContent.js';
import { formatMusicSuggestion } from '../src/commands/musicSuggestion.js';
import { buildCardDetailEmbed, buildCollectionComponents, buildCollectionEmbed } from '../src/services/cardCollectionInteractions.js';

test('formatPhrase selects a deterministic RBE phrase', () => {
  assert.equal(
    formatPhrase(() => 0),
    `🚌 **PHRASE RBE**\n\n« ${RBE_PHRASES[0]} »`,
  );
});

test('fun command responses keep their RBE identity', () => {
  const first = () => 0;

  assert.match(formatBus(first), /BUS TIRÉ AU SORT/);
  assert.match(formatBreakdown(first), /PANNE DÉTECTÉE/);
  assert.match(formatDestiny(first), /LE DESTIN RBE/);
  assert.match(formatControl(first), /CONTRÔLE TECHNIQUE RBE/);
  assert.match(formatDiagnostic('bruit', first), /HUMORISTIQUE/);
  assert.match(formatDraw(first), /NOUVELLE CARTE RBE/);
  assert.match(formatDraw(first), /Commun \(60 %\)/);
  assert.match(formatDraw(() => 0.999), /Mythique \(1 %\)/);
});

test('weighted card draw returns common and mythic cards at probability bounds', () => {
  assert.equal(drawCollectibleCard(() => 0).rarity, 'COMMUN');
  assert.equal(drawCollectibleCard(() => 0.999).rarity, 'MYTHIQUE');
  assert.equal(Object.values(CARD_RARITIES).reduce((total, rarity) => total + rarity.chance, 0), 100);
  assert.equal(new Set(RBE_CARD_CATALOG.map((card) => card.id)).size, RBE_CARD_CATALOG.length);
});

test('/920 help groups commands by category', () => {
  const help = formatHelp();
  assert.match(help, /\*\*RBE\*\*/);
  assert.match(help, /\*\*Utilitaires\*\*/);
  assert.match(help, /\*\*Modération\*\*/);
  assert.match(help, /`\/920 help`/);
});

test('/920 ecouter returns a suggestion for the selected genre or a surprise', () => {
  assert.match(formatMusicSuggestion('rap', () => 0), /À écouter · Rap[\s\S]*Basique/);
  assert.match(formatMusicSuggestion('rock', () => 0), /À écouter · Rock[\s\S]*Song 2/);
  assert.match(formatMusicSuggestion('electro', () => 0), /À écouter · Electro[\s\S]*D\.A\.N\.C\.E\./);
  assert.match(formatMusicSuggestion('pop', () => 0), /À écouter · Pop[\s\S]*La grenade/);
  assert.match(formatMusicSuggestion('surprends_moi', () => 0), /À écouter · Surprends-moi[\s\S]*Basique/);
});

test('Pokédex embeds group all rarities and show empty categories', () => {
  const embed = buildCollectionEmbed('C.Marcy', [], 0).toJSON();
  assert.equal(embed.fields.length, 5);
  assert.match(embed.fields[0].name, /Mythique/);
  assert.equal(embed.fields[0].value, 'Aucune pour le moment.');
  assert.match(embed.fields[4].name, /Commun/);
});

test('Pokédex selector lists owned cards and detail embed describes the selected card', () => {
  const cards = [{ id: 'jour-sans-imprevu', name: 'La journée sans imprévu', rarity: 'MYTHIQUE' as const, description: 'Une journée calme.', quantity: 2, firstAcquired: '2026-10-15T00:00:00.000Z' }];
  const components = buildCollectionComponents('12345678901234567', cards).map((row) => row.toJSON());
  assert.equal(components[0].components[0].options[0].value, cards[0].id);
  assert.match(buildCardDetailEmbed(cards[0]).toJSON().description, /Une journée calme/);
});