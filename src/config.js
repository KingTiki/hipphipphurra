import { resolve } from 'node:path';

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT muss ein gültiger Port sein.');
  const baseUrl = (env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('BASE_URL muss eine HTTP(S)-Adresse ohne Pfad sein.');
  }
  if (env.TEAMS_WEBHOOK_URL && new URL(env.TEAMS_WEBHOOK_URL).protocol !== 'https:') {
    throw new Error('TEAMS_WEBHOOK_URL muss HTTPS verwenden.');
  }
  return { port, host: env.HOST || '0.0.0.0', baseUrl, dbPath: resolve(env.DATA_DIR || 'data', 'kuchenzeit.sqlite'),
    teamsWebhookUrl: env.TEAMS_WEBHOOK_URL || '',
  };
}
