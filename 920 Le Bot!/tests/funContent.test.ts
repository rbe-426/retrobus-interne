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
  assert.match(formatDraw(first), /TIRAGE RBE/);
  assert.match(formatDraw(first), /Commun \(60 %\)/);
  assert.match(formatDraw(() => 0.999), /Mythique \(1 %\)/);
});

test('/920 help groups commands by category', () => {
  const help = formatHelp();
  assert.match(help, /\*\*RBE\*\*/);
  assert.match(help, /\*\*Utilitaires\*\*/);
  assert.match(help, /\*\*Modération\*\*/);
  assert.match(help, /`\/920 help`/);
});

test('/920 ecouter returns a suggestion for the selected mood', () => {
  assert.match(formatMusicSuggestion('calme', () => 0), /À écouter · calme[\s\S]*Sunset Lover/);
  assert.match(formatMusicSuggestion('energie', () => 0), /À écouter · energie[\s\S]*Feel Good Inc\./);
  assert.match(formatMusicSuggestion('retro', () => 0), /À écouter · retro[\s\S]*Voyage, voyage/);
  assert.match(formatMusicSuggestion('francais', () => 0), /À écouter · francais[\s\S]*La grenade/);
});