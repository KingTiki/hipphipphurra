export function createOverview(people, currentMonth, locale = 'en-GB') {
  const monthCounts = Array(12).fill(0);
  for (const person of people) monthCounts[person.month - 1]++;
  const next = [...people].sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, locale))[0] ?? null;
  return {
    next,
    cohort: next ? people.filter(person => person.daysUntil === next.daysUntil) : [],
    monthCounts,
    total: people.length,
    currentMonthCount: monthCounts[currentMonth - 1],
  };
}

export function filterEmployees(people, { month = 'all', currentMonth, search = '', locale = 'en-GB' }) {
  const selectedMonth = month === 'current' ? currentMonth : Number(month);
  const query = search.trim().toLocaleLowerCase(locale);
  return people.filter(person => (!selectedMonth || person.month === selectedMonth)
    && person.name.toLocaleLowerCase(locale).includes(query));
}
