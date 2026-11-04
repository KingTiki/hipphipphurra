import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';
import { berlinDate, describeBirthday, InputError, validatePerson } from './birthdays.js';
import { createCalendar } from './calendar.js';
import { createNotifier } from './notifications.js';
import { createTransports } from './transports.js';
import { requestLanguage } from './language.js';
import { translate } from '../public/i18n.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const assets = { '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/view-model.js': ['view-model.js', 'text/javascript; charset=utf-8'],
  '/i18n.js': ['i18n.js', 'text/javascript; charset=utf-8'],
  '/cake.svg': ['cake.svg', 'image/svg+xml'], '/bunting.svg': ['bunting.svg', 'image/svg+xml'],
  '/confetti.svg': ['confetti.svg', 'image/svg+xml'],
  '/fonts/bricolage-grotesque-latin.woff2': ['fonts/bricolage-grotesque-latin.woff2', 'font/woff2'],
  '/fonts/dm-sans-latin.woff2': ['fonts/dm-sans-latin.woff2', 'font/woff2'],
  '/fonts/bricolage-grotesque-OFL.txt': ['fonts/bricolage-grotesque-OFL.txt', 'text/plain; charset=utf-8'],
  '/fonts/dm-sans-OFL.txt': ['fonts/dm-sans-OFL.txt', 'text/plain; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };

async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new InputError('jsonExpected', 415);
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 16384) throw new InputError('tooLarge', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new InputError('invalidJson'); }
}

export function createApplication({ config = loadConfig(), db = openDatabase(config.dbPath), logger = console,
  clock = () => new Date(), transports = createTransports(config) } = {}) {
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const server = createServer(async (req, res) => {
    let language = requestLanguage(req.headers['accept-language']);
    res.setHeader('Vary', 'Accept-Language');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, config.baseUrl);
      const { pathname } = url;
      if (pathname === '/calendar.ics') language = requestLanguage(req.headers['accept-language'], url.searchParams.get('lang'));
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.headers['x-kuchenzeit'] !== '1') throw new InputError('invalidRequest', 403);
        const origin = req.headers.origin;
        const localOrigin = `http://${req.headers.host}`;
        const secureOrigin = `https://${req.headers.host}`;
        if (origin && ![new URL(config.baseUrl).origin, localOrigin, secureOrigin].includes(origin)) {
          throw new InputError('forbidden', 403);
        }
      }
      if (req.method === 'GET' && pathname === '/health') {
        db.raw.prepare('SELECT 1').get();
        return json(res, 200, { status: 'ok' });
      }
      if (req.method === 'GET' && pathname === '/api/config') {
        return json(res, 200, { teamsEnabled: Boolean(config.teamsWebhookUrl),
          calendarUrl: `${config.baseUrl}/calendar.ics`, timeZone: 'Europe/Berlin', today: berlinDate(clock()).key });
      }
      if (req.method === 'GET' && pathname === '/api/employees') {
        const today = berlinDate(clock());
        return json(res, 200, db.listPeople().map(person => describeBirthday(person, today))
          .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, language)));
      }
      if (req.method === 'POST' && pathname === '/api/employees') {
        const person = db.addPerson(validatePerson(await readJson(req), berlinDate(clock())));
        return json(res, 201, describeBirthday(person, berlinDate(clock())));
      }
      const employee = /^\/api\/employees\/([a-f\d-]{36})$/.exec(pathname);
      if (employee && ['PUT', 'DELETE'].includes(req.method)) {
        const id = employee[1];
        if (!db.getPerson(id)) throw new InputError('deleted', 404);
        if (req.method === 'DELETE') { db.deletePerson(id); return json(res, 200, { ok: true }); }
        const person = db.updatePerson(id, validatePerson(await readJson(req), berlinDate(clock())));
        return json(res, 200, describeBirthday(person, berlinDate(clock())));
      }
      if (['GET', 'HEAD'].includes(req.method) && pathname === '/calendar.ics') {
        res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache',
          'Content-Language': language,
          'Content-Disposition': 'inline; filename="hipphipphurra.ics"' });
        return res.end(req.method === 'HEAD' ? undefined : createCalendar(db.listPeople(), language));
      }
      if (['GET', 'HEAD'].includes(req.method) && assets[pathname]) {
        const [file, type] = assets[pathname];
        const content = await readFile(resolve(publicDir, file));
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'HEAD' ? undefined : content);
      }
      res.setHeader('Content-Language', language);
      json(res, 404, { error: translate(language, 'error.notFound'), code: 'notFound' });
    } catch (error) {
      if (!(error instanceof InputError)) logger.error(JSON.stringify({ event: 'request_failed', code: error.code || 'INTERNAL_ERROR' }));
      if (!res.headersSent) {
        const inputError = error instanceof InputError;
        const code = inputError ? error.code : 'internal';
        const params = inputError ? error.params : {};
        res.setHeader('Content-Language', language);
        json(res, inputError ? error.status : 500, { error: translate(language, `error.${code}`, params), code, params });
      }
      else res.end();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  const tick = createNotifier({ db, config, logger, now: clock, ...transports });
  let timer;
  return { server, db, tick,
    startScheduler() {
      const run = () => tick().catch(error => logger.error(JSON.stringify({ event: 'scheduler_failed', code: error.code || 'SCHEDULER_ERROR' })));
      run(); timer = setInterval(run, 60000); timer.unref();
    },
    async close() {
      clearInterval(timer);
      await new Promise(resolveClose => server.close(resolveClose));
      await tick.idle();
      db.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const config = loadConfig();
    const app = createApplication({ config });
    app.server.listen(config.port, config.host, () => {
      console.info(`Hipphipphurra is running at ${config.baseUrl}`);
      app.startScheduler();
    });
    app.server.on('error', error => { console.error(`Server startup failed: ${error.code || 'SERVER_ERROR'}`); process.exitCode = 1; app.db.close(); });
    let stopping = false;
    for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => {
      if (stopping) return; stopping = true;
      try { await app.close(); } catch { process.exitCode = 1; }
    });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
