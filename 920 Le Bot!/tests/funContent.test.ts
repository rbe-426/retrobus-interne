import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBreakdown,
  formatBus,
  formatControl,
  formatDiagnostic,
  formatDraw,
  formatFeedbackTickets,
  formatCardProgress,
  formatCollectibleCard,
  drawCollectibleCard,
  CARD_RARITIES,
  RBE_CARD_CATALOG,
  formatHelp,
} from '../src/commands/funContent.js';
import { formatMusicSuggestion } from '../src/commands/musicSuggestion.js';
import { buildCardDetailEmbed, buildCollectionComponents, buildCollectionEmbed } from '../src/services/cardCollectionInteractions.js';

test('fun command responses keep their RBE identity', () => {
  const first = () => 0;

  assert.match(formatBus(first), /BUS TIRÉ AU SORT/);
  assert.match(formatBreakdown(first), /PANNE DÉTECTÉE/);
  assert.match(formatControl(first), /CONTRÔLE TECHNIQUE RBE/);
  assert.match(formatDiagnostic('bruit', first), /HUMORISTIQUE/);
  assert.match(formatDraw(first), /🎴 \*\*CARTE/);
  assert.match(formatDraw(first), /Commun \(60 %\)/);
  assert.match(formatDraw(() => 0.999), /Mythique \(1 %\)/);
});

test('breakdown output varies while staying well-formed', () => {
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const outputs = new Set(Array.from({ length: 60 }, () => formatBreakdown(random)));
  assert.ok(outputs.size > 40);
  for (const output of outputs) {
    assert.match(output, /Véhicule : .+\nDéfaut : .+\nDiagnostic : « .+ »\nNiveau de confiance : \d{1,2} %\nGravité : .+\nSignalé par : .+\nAction conseillée : .+\nDélai estimé : .+/);
  }
});

test('feedback tickets show references and statuses', () => {
  const now = new Date().toISOString();
  const text = formatFeedbackTickets([
    { reference: 'waiyl-002', type: 'INCIDENT', title: 'Porte cassée', status: 'IN_PROGRESS', adminNote: 'Pièce commandée', createdAt: now, updatedAt: now },
    { reference: 'waiyl-001', type: 'SUGGESTION', title: 'Nouvelle idée', status: 'OPEN', createdAt: now, updatedAt: now },
  ]);
  assert.match(text, /waiyl-002.*\n🔵 En cours.*\n> 💬 Pièce commandée/);
  assert.match(text, /waiyl-001.*\n🟡 À traiter/);
  assert.match(formatFeedbackTickets([]), /aucune remontée/);
});

test('weighted card draw returns common and mythic cards at probability bounds', () => {
  assert.equal(drawCollectibleCard(() => 0).rarity, 'COMMUN');
  assert.equal(drawCollectibleCard(() => 0.999).rarity, 'MYTHIQUE');
  assert.equal(Object.values(CARD_RARITIES).reduce((total, rarity) => total + rarity.chance, 0), 100);
  assert.equal(new Set(RBE_CARD_CATALOG.map((card) => card.id)).size, RBE_CARD_CATALOG.length);
  assert.equal(RBE_CARD_CATALOG.length, 70);
  assert.deepEqual(Object.keys(CARD_RARITIES).map((rarity) => RBE_CARD_CATALOG.filter((card) => card.rarity === rarity).length), [21, 19, 14, 10, 6]);
  assert.equal(RBE_CARD_CATALOG.filter((card) => card.series === 'Sorties & rassemblements').length, 20);
  assert.ok(RBE_CARD_CATALOG.every((card) => /^[a-z0-9-]{1,80}$/i.test(card.id)));
});

test('card progress text matches the real Pokédex state', () => {
  assert.match(formatCardProgress({ discovered: 1, total: 70, quantity: 1 }, () => 0), /lancé|Première|ouvert/);
  assert.doesNotMatch(formatCardProgress({ discovered: 3, total: 70, quantity: 1 }, () => 0), /Première|lancé/);
  assert.match(formatCardProgress({ discovered: 3, total: 70, quantity: 1 }, () => 0), /3/);
  assert.match(formatCardProgress({ discovered: 12, total: 70, quantity: 2 }, () => 0), /2 exemplaires/);
  assert.match(formatCardProgress({ discovered: 68, total: 70, quantity: 1 }, () => 0), /Plus que \*\*2\*\*/);
});

test('card text varies with the random roll but stays tied to the rarity', () => {
  const mythic = RBE_CARD_CATALOG.find((card) => card.rarity === 'MYTHIQUE')!;
  const texts = new Set([0, 0.3, 0.6, 0.99].map((roll) => formatCollectibleCard(mythic, () => roll)));
  assert.ok(texts.size > 1);
  for (const text of texts) {
    assert.match(text, /MYTHIQUE/);
    assert.match(text, /Mythique \(1 %\)/);
  }
});

test('weighted card draw skips owned cards and rejects a complete collection', () => {
  const firstCommon = RBE_CARD_CATALOG.find((card) => card.rarity === 'COMMUN')!;
  const nextCommon = drawCollectibleCard(() => 0, [firstCommon.id]);
  assert.equal(nextCommon.rarity, 'COMMUN');
  assert.notEqual(nextCommon.id, firstCommon.id);

  const allButOne = RBE_CARD_CATALOG.slice(0, -1).map((card) => card.id);
  assert.equal(drawCollectibleCard(() => 0, allButOne).id, RBE_CARD_CATALOG.at(-1)?.id);
  assert.throws(() => drawCollectibleCard(() => 0, RBE_CARD_CATALOG.map((card) => card.id)), /owns every RBE card/);
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