import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createTransports } from '../src/transports.js';

const payload = { people: [{ name: 'Alex Müller', turningAge: 36 }, { name: 'Ben', turningAge: null }] };

test('Teams transport submits an Adaptive Card to the configured workflow and rejects failures', async t => {
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; });
  const config = loadConfig({ TEAMS_WEBHOOK_URL: 'https://workflow.example.com/secret', BASE_URL: 'https://app.example.com' });
  const transports = createTransports(config); const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return new Response('', { status: 202 }); };
  await transports.sendTeams(payload);
  const request = requests[0]; assert.equal(request.url, config.teamsWebhookUrl); assert.equal(request.options.method, 'POST');
  assert.equal(request.options.redirect, 'error'); assert.ok(request.options.signal instanceof AbortSignal);
  const body = JSON.parse(request.options.body); assert.equal(body.type, 'message');
  const card = body.attachments[0].content;
  assert.equal(card.type, 'AdaptiveCard'); assert.equal(card.actions[0].url, config.baseUrl);
  assert.equal(card.body[0].text, '🎂 Heute wird gefeiert!');
  assert.ok(card.body.some(block => block.text.includes('Alex Müller')));
  globalThis.fetch = async () => new Response('', { status: 429 });
  await assert.rejects(transports.sendTeams(payload), { code: 'TEAMS_HTTP_429' });
});

test('Teams messages use the configured channel language, including ages and action labels', async t => {
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; });
  let card;
  globalThis.fetch = async (_url, options) => {
    card = JSON.parse(options.body).attachments[0].content;
    return new Response('', { status: 202 });
  };
  for (const [language, title, age, noAge, greeting, action] of [
    ['en', '🎂 Time to celebrate!', 'Alex Müller turns 36 today!', 'It’s Ben’s birthday today!',
      'Happy birthday! Wishing you a wonderful day! 🎉🥳', 'All birthdays'],
    ['de', '🎂 Heute wird gefeiert!', 'Alex Müller wird heute 36!', 'Ben hat heute Geburtstag!',
      'Herzlichen Glückwunsch und einen wundervollen Geburtstag! 🎉🥳', 'Alle Geburtstage'],
  ]) {
    await createTransports(loadConfig({ TEAMS_LANGUAGE: language, TEAMS_WEBHOOK_URL: 'https://example.com/hook' })).sendTeams(payload);
    assert.equal(card.body[0].text, title); assert.equal(card.body[1].text, age);
    assert.equal(card.body[2].text, noAge); assert.equal(card.body[3].text, greeting);
    assert.equal(card.actions[0].title, action);
  }
});
