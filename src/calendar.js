const escape = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const compact = value => value.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

// RFC 5545 folds by UTF-8 octets, not JavaScript character count.
export function foldLine(line) {
  let result = ''; let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
    result += char; bytes += size;
  }
  return result;
}

export function createCalendar(people) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hipphipphurra//Geburtstage//DE',
    'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Hipphipphurra · Geburtstage'];
  for (const person of people) {
    const mm = String(person.month).padStart(2, '0');
    const dd = String(person.day).padStart(2, '0');
    const leapDay = person.month === 2 && person.day === 29;
    lines.push('BEGIN:VEVENT', `UID:${person.id}@kuchenzeit`,
      `DTSTAMP:${compact(person.updatedAt)}`, `LAST-MODIFIED:${compact(person.updatedAt)}`,
      `DTSTART;VALUE=DATE:2000${mm}${dd}`, 'DURATION:P1D',
      leapDay ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
      `SUMMARY:${escape(`🎂 ${person.name} hat Geburtstag`)}`, 'TRANSP:TRANSPARENT',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
