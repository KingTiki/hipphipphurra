import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { birthdayDate, detectLanguage, initialLanguage, messages, monthNames, saveLanguage, translate } from '../public/i18n.js';
import { requestLanguage } from '../src/language.js';
import { createCalendar } from '../src/calendar.js';
import { loadConfig } from '../src/config.js';

test('browser preferences match supported regional languages in priority order with an English fallback', () => {
  assert.equal(detectLanguage(['de-CH', 'en-US']), 'de');
  assert.equal(detectLanguage(['en-US', 'de-DE']), 'en');
  assert.equal(detectLanguage(['fr-FR', 'DE-at', 'en']), 'de');
  assert.equal(detectLanguage(['fr', 'ja']), 'en');
  assert.equal(detectLanguage([]), 'en');
});

test('a saved choice overrides the browser and automatic mode restores browser detection', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const browser = { languages: ['de-DE', 'en'], language: 'en-US' };
  assert.deepEqual(initialLanguage(browser, storage), { preference: 'auto', language: 'de' });
  saveLanguage('en', storage);
  assert.deepEqual(initialLanguage(browser, storage), { preference: 'en', language: 'en' });
  saveLanguage('auto', storage);
  assert.deepEqual(initialLanguage(browser, storage), { preference: 'auto', language: 'de' });
  storage.setItem('hipphipphurra.language', 'fr');
  assert.deepEqual(initialLanguage(browser, storage), { preference: 'auto', language: 'de' });
  assert.equal(initialLanguage({ language: 'de-AT' }).language, 'de');
});

test('blocked storage does not prevent language detection or switching', () => {
  const denied = () => { throw new Error('Storage denied'); };
  const storage = { getItem: denied, setItem: denied, removeItem: denied };
  assert.equal(initialLanguage({ languages: ['de'] }, storage).language, 'de');
  assert.doesNotThrow(() => saveLanguage('en', storage));
  assert.doesNotThrow(() => saveLanguage('auto', storage));
});

test('English and German cover identical keys and interpolation placeholders', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.de).sort());
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const key of Object.keys(messages.en)) {
    assert.ok(messages.en[key].length && messages.de[key].length, key);
    assert.deepEqual(placeholders(messages.en[key]), placeholders(messages.de[key]), key);
  }
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n(?:-aria-label|-placeholder)?="([^"]+)"/g)) assert.ok(messages.en[key], key);
  assert.equal(translate('de', 'deleteDescription', { name: 'Alex {name} <Team>' }),
    'Der Geburtstag von Alex {name} <Team> wird aus dem Verzeichnis und dem Kalenderfeed entfernt.');
});

test('month names and dates use the selected locale, including February 29', () => {
  assert.equal(monthNames('en')[2], 'March'); assert.equal(monthNames('de')[2], 'März');
  assert.equal(monthNames('en').length, 12); assert.equal(monthNames('de', 'short').length, 12);
  assert.equal(birthdayDate('en', { month: 2, day: 29 }), '29 February');
  assert.equal(birthdayDate('de', { month: 2, day: 29 }), '29. Februar');
});

test('HTTP language negotiation respects quality weights, exclusions and explicit calendar language', () => {
  assert.equal(requestLanguage('de-DE;q=0.5,en-GB;q=0.9'), 'en');
  assert.equal(requestLanguage('en;q=0,de-AT;q=0.8'), 'de');
  assert.equal(requestLanguage('fr,de;q=0.7,en;q=0.5'), 'de');
  assert.equal(requestLanguage('de;q=invalid,en;q=1'), 'en');
  assert.equal(requestLanguage('de', 'en'), 'en');
  assert.equal(requestLanguage('de', 'fr'), 'de');
  assert.equal(requestLanguage(), 'en');
});

test('calendar translations preserve event identities and recurrence rules', () => {
  const people = [{ id: 'stable', name: 'Alex', day: 29, month: 2, updatedAt: '2026-01-01T00:00:00.000Z' }];
  const en = createCalendar(people, 'en'); const de = createCalendar(people, 'de');
  assert.match(en, /SUMMARY:🎂 Alex’s birthday/); assert.match(de, /SUMMARY:🎂 Alex hat Geburtstag/);
  assert.match(en, /X-WR-CALNAME:Hipphipphurra · Birthdays/);
  assert.match(de, /X-WR-CALNAME:Hipphipphurra · Geburtstage/);
  for (const field of ['UID', 'DTSTART', 'RRULE', 'DTSTAMP', 'LAST-MODIFIED']) {
    const line = text => text.split('\r\n').find(value => value.startsWith(field));
    assert.equal(line(en), line(de));
  }
});

test('Teams language defaults to German and only accepts the supported settings', () => {
  assert.equal(loadConfig({}).teamsLanguage, 'de');
  assert.equal(loadConfig({ TEAMS_LANGUAGE: 'de' }).teamsLanguage, 'de');
  assert.equal(loadConfig({ TEAMS_LANGUAGE: 'en' }).teamsLanguage, 'en');
  assert.throws(() => loadConfig({ TEAMS_LANGUAGE: 'fr' }), /TEAMS_LANGUAGE/);
});
