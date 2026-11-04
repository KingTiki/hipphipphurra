import { resolve } from 'node:path';

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be a valid port.');
  const baseUrl = (env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('BASE_URL must be an HTTP(S) address without a path.');
  }
  if (env.TEAMS_WEBHOOK_URL && new URL(env.TEAMS_WEBHOOK_URL).protocol !== 'https:') {
    throw new Error('TEAMS_WEBHOOK_URL must use HTTPS.');
  }
  const teamsLanguage = env.TEAMS_LANGUAGE || 'de';
  if (!['en', 'de'].includes(teamsLanguage)) throw new Error('TEAMS_LANGUAGE must be en or de.');
  return { port, host: env.HOST || '0.0.0.0', baseUrl, dbPath: resolve(env.DATA_DIR || 'data', 'kuchenzeit.sqlite'),
    teamsWebhookUrl: env.TEAMS_WEBHOOK_URL || '', teamsLanguage,
  };
}
