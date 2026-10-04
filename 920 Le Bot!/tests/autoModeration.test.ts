import assert from 'node:assert/strict';
import test from 'node:test';
import { containsLink, reachesLimit } from '../src/services/autoModeration.js';

test('automod recognizes links and only flags timestamps inside its configured window', () => {
  assert.equal(containsLink('Voir https://association-rbe.fr'), true);
  assert.equal(containsLink('Aucun lien ici'), false);
  assert.equal(reachesLimit([1_000, 2_000, 3_000], 4_000, 3, 5), true);
  assert.equal(reachesLimit([1_000, 2_000, 3_000], 10_000, 3, 5), false);
});