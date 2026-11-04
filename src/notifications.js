import { berlinDate, describeBirthday } from './birthdays.js';

export function createNotifier({ db, config, sendTeams, logger = console, now = () => new Date() }) {
  let active = null;
  async function run() {
    const instant = now(); const today = berlinDate(instant);
    if (today.hour < 8 || !config.teamsWebhookUrl) return;
    const people = db.listPeople().map(person => describeBirthday(person, today)).filter(person => person.isToday);
    if (people.length) db.queue(today.key, { people });
    for (const delivery of db.due(today.key, instant.getTime())) {
      db.attempt(delivery.id, instant.getTime() + 5 * 60000);
      try {
        await sendTeams(JSON.parse(delivery.payload));
        db.sent(delivery.id, now().toISOString());
        logger.info(JSON.stringify({ event: 'delivery_sent', channel: 'teams', id: delivery.id, date: today.key }));
      } catch (error) {
        db.fail(delivery.id);
        logger.error(JSON.stringify({ event: 'delivery_failed', channel: 'teams', id: delivery.id,
          attempt: delivery.attempts + 1, code: error.code || 'DELIVERY_ERROR' }));
      }
    }
  }
  function tick() {
    if (!active) active = run().finally(() => { active = null; });
    return active;
  }
  tick.idle = () => active ?? Promise.resolve();
  return tick;
}
