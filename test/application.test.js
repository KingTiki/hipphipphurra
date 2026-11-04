import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../src/server.js';
import { openDatabase } from '../src/database.js';
import { loadConfig } from '../src/config.js';

const quiet = { info() {}, error() {} };
const payload = { name: 'Alex Müller 🎂', day: 29, month: 10, year: 1990 };

async function start(t) {
  const db = openDatabase();
  const config = loadConfig({});
  const app = createApplication({ config, db, logger: quiet, clock: () => new Date('2026-10-28T07:00:00Z'),
    transports: { sendTeams: async () => {} } });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const request = (path, method = 'GET', body, headers = {}) => fetch(base + path, { method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', 'X-Kuchenzeit': '1', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { app, db, request };
}

test('employee API creates, lists, changes and deletes persistent Unicode data', async t => {
  const { request } = await start(t);
  let response = await request('/api/employees', 'POST', payload); assert.equal(response.status, 201);
  const created = await response.json(); assert.equal(created.name, payload.name); assert.equal(created.daysUntil, 1);
  assert.equal(created.turningAge, 36);
  response = await request('/api/employees'); assert.equal((await response.json()).length, 1);
  response = await request(`/api/employees/${created.id}`, 'PUT', { ...payload, name: 'Alex', year: null });
  assert.equal((await response.json()).turningAge, null);
  response = await request(`/api/employees/${created.id}`, 'DELETE', {}); assert.equal(response.status, 200);
  response = await request(`/api/employees/${created.id}`, 'DELETE', {}); assert.equal(response.status, 404);
  assert.deepEqual(await (await request('/api/employees')).json(), []);
});
test('API rejects invalid dates, cross-origin writes, malformed JSON and oversized requests', async t => {
  const { request, app } = await start(t);
  assert.equal((await request('/api/employees', 'POST', { ...payload, month: 2, day: 31 })).status, 400);
  assert.equal((await request('/api/employees', 'POST', payload, { Origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal((await request('/api/employees', 'POST', payload, { 'X-Kuchenzeit': '' })).status, 403);
  assert.equal((await request('/api/employees', 'POST', payload, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await request('/api/employees', 'POST', { ...payload, name: 'a'.repeat(20000) })).status, 413);
  const url = `http://127.0.0.1:${app.server.address().port}/api/employees`;
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kuchenzeit': '1' }, body: '{' });
  assert.equal(response.status, 400);
});
test('removed subscription endpoints and unsubscribe page return 404', async t => {
  const { request } = await start(t);
  assert.equal((await request('/api/subscriptions', 'POST', {})).status, 404);
  assert.equal((await request('/api/subscriptions/unsubscribe', 'POST', {})).status, 404);
  assert.equal((await request('/unsubscribe?token=old')).status, 404);
});
test('public config exposes calendar and Teams availability without credentials', async t => {
  const { request } = await start(t);
  const config = await (await request('/api/config')).json();
  assert.equal(config.teamsEnabled, false);
  assert.equal(config.today, '2026-10-28');
  assert.deepEqual(Object.keys(config).sort(), ['calendarUrl', 'teamsEnabled', 'timeZone', 'today'].sort());
});
test('static page, scripts, styles, calendar and health are served with suitable types', async t => {
  const { request } = await start(t);
  for (const [path, type] of [['/', 'text/html'], ['/style.css', 'text/css'], ['/app.js', 'text/javascript'], ['/i18n.js', 'text/javascript'], ['/view-model.js', 'text/javascript'], ['/favicon.svg', 'image/svg+xml'], ['/cake.svg', 'image/svg+xml'], ['/bunting.svg', 'image/svg+xml'], ['/confetti.svg', 'image/svg+xml'], ['/calendar.ics', 'text/calendar']]) {
    const response = await request(path); assert.equal(response.status, 200); assert.ok(response.headers.get('content-type').startsWith(type));
    assert.ok(response.headers.get('content-security-policy')); await response.text();
  }
  assert.deepEqual(await (await request('/health')).json(), { status: 'ok' });
  assert.equal((await request('/not-found')).status, 404);
  assert.equal((await request('/.env')).status, 404);
  for (const font of ['bricolage-grotesque', 'dm-sans']) {
    const response = await request(`/fonts/${font}-latin.woff2`);
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString(), 'wOF2');
  }
});
test('API validation errors follow the requested language and include stable error codes', async t => {
  const { request } = await start(t);
  for (const [language, expected] of [['en', 'Please enter a name with no more than 120 characters.'],
    ['de-CH,en;q=0.8', 'Bitte einen Namen mit höchstens 120 Zeichen eingeben.']]) {
    const response = await request('/api/employees', 'POST', { ...payload, name: '' }, { 'Accept-Language': language });
    assert.equal(response.status, 400); assert.equal(response.headers.get('vary'), 'Accept-Language');
    assert.deepEqual(await response.json(), { error: expected, code: 'invalidName', params: {} });
  }
  const response = await request('/api/employees', 'POST', { ...payload, year: 1800 }, { 'Accept-Language': 'de' });
  const error = await response.json();
  assert.equal(error.code, 'invalidYear'); assert.deepEqual(error.params, { year: 2026 });
  assert.match(error.error, /1900 und 2026/);
  assert.equal((await (await request('/missing', 'GET', undefined, { 'Accept-Language': 'de' })).json()).error,
    'Hier gibt es leider nichts zu finden.');
});

test('calendar language is fixed by the subscription URL and also works for HEAD requests', async t => {
  const { request } = await start(t);
  await request('/api/employees', 'POST', payload);
  const german = await request('/calendar.ics?lang=de', 'GET', undefined, { 'Accept-Language': 'en' });
  assert.equal(german.headers.get('content-language'), 'de');
  assert.match(await german.text(), /hat Geburtstag/);
  const english = await request('/calendar.ics?lang=en', 'GET', undefined, { 'Accept-Language': 'de' });
  assert.equal(english.headers.get('content-language'), 'en'); assert.match(await english.text(), /birthday/);
  const negotiated = await request('/calendar.ics', 'GET', undefined, { 'Accept-Language': 'fr,de;q=0.8' });
  assert.equal(negotiated.headers.get('content-language'), 'de');
  const head = await request('/calendar.ics?lang=de', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-language'), 'de'); assert.equal(await head.text(), '');
});

test('SQLite preserves people and Teams delivery status when reopened', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kuchenzeit-test-'));
  const path = join(dir, 'data.sqlite'); let db;
  try {
    db = openDatabase(path); const person = db.addPerson(payload);
    db.queue('2026-10-29', { people: [person] });
    const delivery = db.due('2026-10-29', Date.now())[0]; db.sent(delivery.id, new Date().toISOString());
    db.close(); db = openDatabase(path);
    assert.equal(db.listPeople()[0].name, payload.name);
    assert.equal(db.due('2026-10-29', Date.now()).length, 0);
  } finally { db?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('v1 migration removes old mail data and preserves employees and Teams delivery history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kuchenzeit-migration-'));
  const path = join(dir, 'data.sqlite'); let db;
  try {
    db = openDatabase(path);
    const person = db.addPerson(payload);
    db.queue('2026-10-29', { people: [person] });
    const delivery = db.due('2026-10-29', Date.now())[0];
    db.attempt(delivery.id, 12345); db.sent(delivery.id, '2026-10-29T07:00:00.000Z');
    db.raw.exec(`CREATE TABLE subscriptions (email TEXT, token TEXT);
      INSERT INTO subscriptions VALUES ('old@example.com', 'old-token');
      INSERT INTO deliveries (date, channel, target, payload) VALUES ('2026-10-29', 'email', 'old@example.com', '{}');
      PRAGMA user_version = 1;`);
    db.close(); db = openDatabase(path);
    assert.equal(db.raw.prepare('PRAGMA user_version').get().user_version, 2);
    assert.equal(db.listPeople()[0].id, person.id);
    assert.equal(db.raw.prepare("SELECT name FROM sqlite_schema WHERE name = 'subscriptions'").get(), undefined);
    const rows = db.raw.prepare('SELECT * FROM deliveries').all();
    assert.equal(rows.length, 1); assert.equal(rows[0].channel, 'teams');
    assert.equal(rows[0].status, 'sent'); assert.equal(rows[0].attempts, 1);
    assert.equal(rows[0].sentAt, '2026-10-29T07:00:00.000Z');
    db.close(); db = openDatabase(path);
    assert.equal(db.listPeople().length, 1); assert.equal(db.due('2026-10-29', Date.now()).length, 0);
  } finally { db?.close(); rmSync(dir, { recursive: true, force: true }); }
});
