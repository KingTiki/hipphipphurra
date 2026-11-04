import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const suffix = randomUUID().slice(0, 8);
const container = `hipphipphurra-smoke-${suffix}`;
const volume = `${container}-data`;
const image = process.argv[2] || 'hipphipphurra:local';
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let containerCreated = false; let volumeCreated = false;

try {
  docker(['volume', 'create', volume]); volumeCreated = true;
  docker(['run', '-d', '--name', container, '-p', '127.0.0.1::3000', '-v', `${volume}:/data`, image]); containerCreated = true;
  const containerUrl = () => `http://${docker(['port', container, '3000/tcp']).split('\n')[0]}`;
  let base = containerUrl();
  async function ready() {
    for (let attempt = 0; attempt < 40; attempt++) {
      try { const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; }
      catch { /* Startup may take a moment. */ }
      await delay(250);
    }
    throw new Error(`Container wurde nicht bereit. Logs: ${docker(['logs', container])}`);
  }
  await ready();
  assert.deepEqual(await (await fetch(`${base}/api/employees`)).json(), []);
  const created = await fetch(`${base}/api/employees`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kuchenzeit': '1' },
    body: JSON.stringify({ name: 'Docker Test', day: 17, month: 5, year: null }) });
  assert.equal(created.status, 201);
  const person = await created.json();
  docker(['restart', container]); base = containerUrl(); await ready();
  const people = await (await fetch(`${base}/api/employees`)).json();
  assert.equal(people.length, 1); assert.equal(people[0].id, person.id);
  assert.match(await (await fetch(`${base}/calendar.ics`)).text(), /Docker Test/);
  assert.match(await (await fetch(base)).text(), /Geburtstage in der Abteilung/);
  assert.equal(docker(['exec', container, 'id', '-u']), '1000');
  assert.match(docker(['exec', container, 'cat', '/app/LICENSE']), /MIT License/);
  assert.match(docker(['exec', container, 'cat', '/app/THIRD_PARTY_NOTICES.md']), /SIL Open Font License/);
  for (const font of ['bricolage-grotesque', 'dm-sans']) {
    const response = await fetch(`${base}/fonts/${font}-OFL.txt`);
    assert.equal(response.status, 200); assert.match(await response.text(), /SIL OPEN FONT LICENSE Version 1.1/);
  }
  console.log('Docker-Smoke-Test erfolgreich: HTTP, CRUD, Kalender, Lizenzen, Nicht-Root-Betrieb und Daten nach Container-Neustart.');
} finally {
  if (containerCreated) docker(['rm', '-f', container]);
  if (volumeCreated) docker(['volume', 'rm', volume]);
}
