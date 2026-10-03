import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBirthdayDate, getAge, parseBirthdayDate } from '../src/services/birthdays/birthdayDate.js';

const referenceDate = new Date('2026-10-03T12:00:00.000Z');

test('parseBirthdayDate validates an existing past date', () => {
  const birthday = parseBirthdayDate('04/10/2000', referenceDate);

  assert.equal(formatBirthdayDate(birthday), '4 octobre');
  assert.equal(getAge(birthday, referenceDate), 25);
});

test('parseBirthdayDate rejects impossible and future dates', () => {
  assert.throws(() => parseBirthdayDate('31/02/2000', referenceDate), /invalide/);
  assert.throws(() => parseBirthdayDate('04/10/2026', referenceDate), /futur/);
});