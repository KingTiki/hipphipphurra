export const TIME_ZONE = 'Europe/Berlin';

export function berlinDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour, minute: +parts.minute,
    key: `${parts.year}-${parts.month}-${parts.day}` };
}

export const isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export function occurrence(person, year) {
  return { year, month: person.month,
    day: person.month === 2 && person.day === 29 && !isLeapYear(year) ? 28 : person.day };
}

export function dateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const stamp = ({ year, month, day }) => Date.UTC(year, month - 1, day);

export function describeBirthday(person, today = berlinDate()) {
  let next = occurrence(person, today.year);
  if (stamp(next) < stamp(today)) next = occurrence(person, today.year + 1);
  const birthdayThisYear = occurrence(person, today.year);
  return { ...person, nextDate: dateKey(next),
    daysUntil: Math.round((stamp(next) - stamp(today)) / 86400000),
    turningAge: person.year === null ? null : next.year - person.year,
    currentAge: person.year === null ? null : today.year - person.year - (stamp(birthdayThisYear) > stamp(today) ? 1 : 0),
    isToday: stamp(next) === stamp(today) };
}

export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function validatePerson(input, today = berlinDate()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Bitte prüfe die Eingaben.');
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const { day, month } = input;
  const year = input.year === '' || input.year === undefined || input.year === null ? null : input.year;
  if (!name || name.length > 120) throw new InputError('Bitte einen Namen mit höchstens 120 Zeichen eingeben.');
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1) {
    throw new InputError('Bitte einen gültigen Geburtstag eingeben.');
  }
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > today.year)) {
    throw new InputError(`Das Geburtsjahr muss zwischen 1900 und ${today.year} liegen.`);
  }
  const referenceYear = year ?? 2000;
  const candidate = new Date(Date.UTC(referenceYear, month - 1, day));
  if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    throw new InputError('Diesen Tag gibt es im gewählten Monat nicht.');
  }
  if (year !== null && stamp({ year, month, day }) > stamp(today)) throw new InputError('Der Geburtstag darf nicht in der Zukunft liegen.');
  return { name, day, month, year };
}

