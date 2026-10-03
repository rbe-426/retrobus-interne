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
  formatPhrase,
} from '../src/commands/funContent.js';

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
});