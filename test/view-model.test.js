import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverview, filterEmployees } from '../public/view-model.js';

const people = [
  { id: 'september', name: 'Alex Müller', month: 9, daysUntil: 316 },
  { id: 'january', name: 'Ben', month: 1, daysUntil: 64 },
  { id: 'october', name: 'Clara', month: 10, daysUntil: 0 },
  { id: 'today', name: 'Daria', month: 10, daysUntil: 0 },
];

test('overview chooses the next real birthday without changing employee order', () => {
  const before = people.map(person => person.id);
  const overview = createOverview(people, 10);
  assert.equal(overview.next.id, 'october');
  assert.deepEqual(overview.cohort.map(person => person.id), ['october', 'today']);
  assert.deepEqual(people.map(person => person.id), before);
  assert.equal(overview.currentMonthCount, 2); assert.equal(overview.total, 4);
});

test('year overview counts all twelve months including empty months', () => {
  const { monthCounts } = createOverview(people, 10);
  assert.equal(monthCounts.length, 12); assert.equal(monthCounts[0], 1);
  assert.equal(monthCounts[8], 1); assert.equal(monthCounts[9], 2);
  assert.equal(monthCounts[1], 0);
});

test('overview supports an empty directory without an invented birthday', () => {
  const overview = createOverview([], 10);
  assert.equal(overview.next, null); assert.deepEqual(overview.cohort, []);
  assert.equal(overview.total, 0); assert.equal(overview.currentMonthCount, 0);
});

test('year-grid month selection filters the directory to exactly that month', () => {
  assert.deepEqual(filterEmployees(people, { month: '9', currentMonth: 10 }).map(person => person.id), ['september']);
  assert.deepEqual(filterEmployees(people, { month: '2', currentMonth: 10 }), []);
});

test('current-month and all-month controls reset the selected-month filter', () => {
  assert.equal(filterEmployees(people, { month: 'current', currentMonth: 10 }).length, 2);
  assert.equal(filterEmployees(people, { month: 'all', currentMonth: 10 }).length, 4);
});

test('search combines with month selection and handles German names case-insensitively', () => {
  assert.deepEqual(filterEmployees(people, { month: '9', currentMonth: 10, search: ' MÜLLER ' }).map(person => person.id), ['september']);
  assert.deepEqual(filterEmployees(people, { month: 'current', currentMonth: 10, search: 'müller' }), []);
});
