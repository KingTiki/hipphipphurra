export function createTransports(config) {
  return {
    async sendTeams({ people }) {
      const body = {
        type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null,
          content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.2',
            body: [{ type: 'TextBlock', text: 'Heutige Geburtstage im Team', weight: 'Bolder', size: 'Large', wrap: true },
              ...people.map(person => ({ type: 'TextBlock', text: `${person.name}${person.turningAge === null ? '' : ` wird ${person.turningAge}`}`, wrap: true }))],
            actions: [{ type: 'Action.OpenUrl', title: 'Alle Geburtstage', url: config.baseUrl }] } }],
      };
      const response = await fetch(config.teamsWebhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      if (!response.ok) { const error = new Error('Teams-Versand fehlgeschlagen.'); error.code = `TEAMS_HTTP_${response.status}`; throw error; }
      await response.body?.cancel();
    },
  };
}
