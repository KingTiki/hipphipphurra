import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berlinDate, describeBirthday, validatePerson } from '../src/birthdays.js';
import { createCalendar, foldLine } from '../src/calendar.js';
import { loadConfig } from '../src/config.js';

const today = { year: 2026, month: 10, day: 28 };
const person = { id: 'test-id', name: 'Alex Müller', day: 28, month: 10, year: 1990, updatedAt: '2026-10-28T06:00:00.000Z' };

test('birthday today and age are computed on the local date', () => {
  const result = describeBirthday(person, today);
  assert.equal(result.daysUntil, 0); assert.equal(result.turningAge, 36);
  assert.equal(result.currentAge, 36); assert.equal(result.isToday, true);
});
test('upcoming and current age differ before a birthday', () => {
  const result = describeBirthday({ ...person, day: 29 }, today);
  assert.equal(result.daysUntil, 1); assert.equal(result.turningAge, 36); assert.equal(result.currentAge, 35);
});
test('birthdays wrap over the end of the year', () => {
  const result = describeBirthday({ ...person, day: 1, month: 1 }, { year: 2026, month: 12, day: 31 });
  assert.equal(result.nextDate, '2027-01-01'); assert.equal(result.daysUntil, 1);
});
test('February 29 uses February 28 in non-leap years and February 29 in leap years', () => {
  const leap = { ...person, day: 29, month: 2, year: 2000 };
  assert.equal(describeBirthday(leap, { year: 2027, month: 2, day: 28 }).isToday, true);
  assert.equal(describeBirthday(leap, { year: 2028, month: 2, day: 28 }).daysUntil, 1);
  assert.equal(describeBirthday(leap, { year: 2028, month: 2, day: 29 }).isToday, true);
});
test('day distance does not change across daylight saving transitions', () => {
  assert.equal(describeBirthday({ ...person, day: 30, month: 3 }, { year: 2026, month: 3, day: 28 }).daysUntil, 2);
});
test('Berlin scheduling observes winter and summer time', () => {
  assert.equal(berlinDate(new Date('2026-10-28T07:00:00Z')).hour, 8);
  assert.equal(berlinDate(new Date('2026-06-28T06:00:00Z')).hour, 8);
  assert.equal(berlinDate(new Date('2026-12-31T23:15:00Z')).key, '2027-01-01');
});
test('birth year is optional and names are normalized', () => {
  assert.deepEqual(validatePerson({ name: '  Alex   Müller ', day: 29, month: 2 }, today), { name: 'Alex Müller', day: 29, month: 2, year: null });
  assert.equal(describeBirthday({ ...person, year: null }, today).turningAge, null);
});
test('invalid dates, types, years and future births are rejected', () => {
  for (const input of [null, [], { name: '', day: 1, month: 1 }, { ...person, day: 31, month: 4 },
    { ...person, day: 29, month: 2, year: 2025 }, { ...person, day: '28' }, { ...person, year: 1899 },
    { ...person, day: 29, year: 2026 }, { ...person, month: 13 }, { ...person, year: '1990' }]) {
    assert.throws(() => validatePerson(input, today));
  }
});
test('calendar uses stable IDs, date-only annual events, CRLF and leap-day policy', () => {
  const result = createCalendar([person, { ...person, id: 'leap', day: 29, month: 2 }]);
  assert.match(result, /UID:test-id@kuchenzeit/);
  assert.match(result, /DTSTART;VALUE=DATE:20001028/);
  assert.match(result, /RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1/);
  assert.match(result, /DURATION:P1D/); assert.ok(result.endsWith('END:VCALENDAR\r\n'));
  assert.equal(result.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(createCalendar([]).includes('VEVENT'), false);
});
test('calendar escapes text and folds long Unicode lines to at most 75 octets', () => {
  const result = createCalendar([{ ...person, name: 'Alex; Team,\nHallo \\ ' + '🎂'.repeat(60) }]);
  assert.match(result, /Alex\\; Team\\,\\nHallo \\\\/);
  for (const line of result.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  const text = 'SUMMARY:' + 'ä🎂'.repeat(80);
  assert.equal(foldLine(text).replace(/\r\n /g, ''), text);
});
test('configuration rejects unsafe base URL and webhook shapes', () => {
  assert.equal(loadConfig({}).teamsWebhookUrl, '');
  assert.equal(loadConfig({ TEAMS_WEBHOOK_URL: 'https://example.com/hook' }).teamsWebhookUrl, 'https://example.com/hook');
  for (const env of [{ BASE_URL: 'https://example.com/subpath' },
    { BASE_URL: 'ftp://example.com' }, { TEAMS_WEBHOOK_URL: 'http://example.com' }, { PORT: '-1' }]) assert.throws(() => loadConfig(env));
});
