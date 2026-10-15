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
  formatHelp,
  formatPhrase,
} from '../src/commands/funContent.js';
import { formatMusicSuggestion } from '../src/commands/musicSuggestion.js';

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