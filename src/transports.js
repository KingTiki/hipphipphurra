import { translate } from '../public/i18n.js';

export function createTransports(config) {
  const t = (key, values) => translate(config.teamsLanguage || 'de', key, values);
  return {
    async sendTeams({ people }) {
      const body = {
        type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null,
          content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.2',
            body: [{ type: 'TextBlock', text: t('teamsTitle'), weight: 'Bolder', size: 'Large', wrap: true },
              ...people.map(person => ({ type: 'TextBlock', text: t(person.turningAge === null ? 'teamsPerson' : 'teamsPersonAge',
                { name: person.name, age: person.turningAge }), wrap: true })),
              { type: 'TextBlock', text: t('teamsGreeting'), spacing: 'Medium', wrap: true }],
            actions: [{ type: 'Action.OpenUrl', title: t('teamsAction'), url: config.baseUrl }] } }],
      };
      const response = await fetch(config.teamsWebhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      if (!response.ok) { const error = new Error('Teams delivery failed.'); error.code = `TEAMS_HTTP_${response.status}`; throw error; }
      await response.body?.cancel();
    },
  };
}
