import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/database.js';
import { createNotifier } from '../src/notifications.js';

const quiet = { info() {}, error() {} };
function setup(t, instant = '2026-10-28T07:00:00Z') {
  const db = openDatabase(); t.after(() => db.close());
  const clock = { value: new Date(instant) }; const sent = { teams: [] };
  const config = { teamsWebhookUrl: 'https://example.invalid' };
  db.addPerson({ name: 'Alex', day: 28, month: 10, year: 1990 });
  const sendTeams = async payload => sent.teams.push(payload);
  const build = overrides => createNotifier({ db, config, logger: quiet, now: () => clock.value, sendTeams, ...overrides });
  return { db, clock, sent, config, build };
}
test('one Teams card combines all birthdays and persists success', async t => {
  const { db, sent, build } = setup(t);
  db.addPerson({ name: 'Ben', day: 28, month: 10, year: null });
  await build()(); await build()();
  assert.equal(sent.teams.length, 1);
  assert.equal(sent.teams[0].people.length, 2); assert.equal(sent.teams[0].people[0].turningAge, 36);
});
test('nothing before 08:00 Berlin, then catch up on the same day', async t => {
  const { sent, clock, build } = setup(t, '2026-10-28T06:59:00Z'); const tick = build();
  await tick(); assert.equal(sent.teams.length, 0);
  clock.value = new Date('2026-10-28T19:00:00Z'); await tick(); assert.equal(sent.teams.length, 1);
});
test('no birthday means no messages and previous days are never caught up', async t => {
  const { db, sent, clock, build } = setup(t); const tick = build();
  clock.value = new Date('2026-10-29T07:00:00Z');
  db.queue('2026-10-28', { people: [] });
  await tick(); assert.equal(sent.teams.length, 0);
});
test('failures retry at five-minute intervals, up to three attempts', async t => {
  const { db, clock, build } = setup(t); let attempts = 0;
  const tick = build({ sendTeams: async () => { attempts++; throw new Error('test'); } });
  await tick(); await tick(); assert.equal(attempts, 1);
  clock.value = new Date('2026-10-28T07:05:00Z'); await tick();
  clock.value = new Date('2026-10-28T07:10:00Z'); await tick();
  clock.value = new Date('2026-10-28T07:20:00Z'); await tick();
  assert.equal(attempts, 3);
  assert.equal(db.raw.prepare("SELECT status FROM deliveries WHERE channel='teams'").get().status, 'failed');
});
test('successful Teams retry is not repeated', async t => {
  const { db, clock, build } = setup(t); let attempts = 0;
  const tick = build({ sendTeams: async () => { if (++attempts === 1) throw new Error('test'); } });
  await tick(); clock.value = new Date('2026-10-28T07:05:00Z'); await tick(); await tick();
  assert.equal(attempts, 2);
  assert.equal(db.due('2026-10-28', Date.now()).length, 0);
});
test('overlapping scheduler calls share one delivery operation', async t => {
  const { build } = setup(t); let attempts = 0; let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const tick = build({ sendTeams: async () => { attempts++; await blocked; } });
  const first = tick(); const second = tick();
  assert.equal(first, second); release(); await Promise.all([first, second]);
  assert.equal(attempts, 1); await tick.idle();
});
test('weekend birthdays are delivered and disabled Teams stays silent', async t => {
  const { db, clock, config, sent, build } = setup(t);
  db.addPerson({ name: 'Saturday', day: 31, month: 10, year: null });
  clock.value = new Date('2026-10-31T07:00:00Z');
  const tick = build(); await tick(); assert.equal(sent.teams.length, 1);
  config.teamsWebhookUrl = ''; clock.value = new Date('2026-10-28T07:00:00Z'); await tick();
  assert.equal(sent.teams.length, 1); assert.equal(db.due('2026-10-28', Date.now()).length, 0);
});
