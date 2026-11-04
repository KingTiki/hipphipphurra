import { createOverview, filterEmployees } from './view-model.js';

const $ = selector => document.querySelector(selector);
const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const colors = ['lavender', 'sage', 'peach', 'butter'];
const state = { people: [], config: null, filter: 'all', search: '', deleteId: null, toastTimer: null };
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const initials = name => name.trim().split(/\s+/).filter(Boolean).filter((_, i, list) => i === 0 || i === list.length - 1).map(part => [...part][0]).join('').toLocaleUpperCase('de').slice(0, 2);
const color = name => colors[[...name].reduce((sum, char) => sum + char.codePointAt(0), 0) % colors.length];
const avatar = person => `<span class="avatar ${color(person.name)}" aria-hidden="true">${escapeHtml(initials(person.name))}</span>`;
const countdown = days => days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `In ${days} Tagen`;
const dateLabel = person => `${person.day}. ${months[person.month - 1]}`;

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Kuchenzeit': '1' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Das hat leider nicht geklappt.');
  return result;
}

function toast(message) {
  clearTimeout(state.toastTimer);
  $('#toast').textContent = message; $('#toast').hidden = false;
  state.toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}

function message(selector, text, error = false) {
  const element = $(selector); element.textContent = text; element.hidden = !text;
  element.classList.toggle('error', error);
}

function render() {
  const currentMonth = +(state.config?.today || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())).split('-')[1];
  const overview = createOverview(state.people, currentMonth);
  const { next, cohort } = overview;
  $('#next-name').textContent = next?.name || 'Noch keine';
  $('#next-name').title = next?.name || '';
  $('#next-status').textContent = next ? next.isToday ? 'feiert heute.' : 'feiert bald.' : 'Einträge.';
  $('#next-date').textContent = next ? `${dateLabel(next)}${next.turningAge === null ? '' : ` · ${next.isToday ? '' : 'wird '}${next.turningAge} Jahre`}` : 'Mitarbeiter und Geburtstag unten hinzufügen.';
  $('#next-days').textContent = next?.daysUntil ?? '–';
  $('#next-days-label').textContent = next ? next.isToday ? 'Heute ist Geburtstag' : next.daysUntil === 1 ? 'Tag bis zum Geburtstag' : 'Tage bis zum Geburtstag' : 'Noch kein Termin';
  $('#next-peers').hidden = cohort.length < 2;
  $('#next-peers').textContent = cohort.length > 1 ? `Am selben Tag: ${cohort.filter(person => person.id !== next.id).map(person => person.name).join(', ')}` : '';
  $('.hero').classList.toggle('is-today', Boolean(next?.isToday));
  const selectedMonth = state.filter === 'current' ? currentMonth : Number(state.filter);
  for (const button of document.querySelectorAll('[data-month]')) {
    const month = Number(button.dataset.month);
    const selected = month ? month === selectedMonth : button.dataset.month === state.filter;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (month) {
      const count = overview.monthCounts[month - 1];
      button.classList.toggle('has-birthdays', count > 0);
      button.classList.toggle('is-current', month === currentMonth);
      const label = `${months[month - 1]}: ${count} ${count === 1 ? 'Geburtstag' : 'Geburtstage'}${month === currentMonth ? ' (aktueller Monat)' : ''}`;
      button.setAttribute('aria-label', label); button.title = label;
    }
  }
  $('#year-summary').textContent = `${overview.total} ${overview.total === 1 ? 'Geburtstag' : 'Geburtstage'} in der Abteilung. ${overview.currentMonthCount === 0 ? 'In diesem Monat stehen keine Geburtstage an.' : `Davon ${overview.currentMonthCount} im ${months[currentMonth - 1]}.`}`;
  const filtered = filterEmployees(state.people, { month: state.filter, currentMonth, search: state.search });
  $('#directory-count').textContent = `${filtered.length} Mitarbeiter`;
  $('#directory').innerHTML = filtered.length ? months.map((month, index) => {
    const people = filtered.filter(person => person.month === index + 1).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, 'de'));
    if (!people.length) return '';
    return `<section class="month-group" aria-label="Geburtstage im ${month}"><h3 class="month-heading">${month}<span>· ${people.length} ${people.length === 1 ? 'Geburtstag' : 'Geburtstage'}</span></h3>${people.map(person => `
      <div class="employee-row">${avatar(person)}<div class="employee-details"><span class="employee-name">${escapeHtml(person.name)}</span>
      <span class="employee-date">${person.day}. ${month}${person.turningAge === null ? '' : ` · ${person.isToday ? '' : 'wird '}${person.turningAge}`}</span></div>
      <span class="employee-countdown${person.isToday ? ' today' : person.id === next?.id ? ' is-next' : ''}">${countdown(person.daysUntil)}</span>
      <div class="row-actions"><button class="icon-button" data-edit="${person.id}" aria-label="${escapeHtml(person.name)} bearbeiten" title="Bearbeiten">${icon('edit')}</button><button class="icon-button delete-button" data-delete="${person.id}" aria-label="${escapeHtml(person.name)} löschen" title="Löschen">${icon('trash')}</button></div></div>`).join('')}</section>`;
  }).join('') : `<div class="directory-empty">${icon(state.search ? 'search' : 'calendar')}<strong>${state.search ? 'Keine Mitarbeiter gefunden.' : state.people.length ? 'Keine Geburtstage im ausgewählten Monat.' : 'Noch keine Mitarbeiter eingetragen.'}</strong>${state.search ? 'Versuche es mit einem anderen Namen.' : state.people.length ? 'Unter „Alle Monate“ findest du alle Geburtstage.' : 'Neue Einträge erscheinen hier nach dem Hinzufügen.'}</div>`;
}

function renderChannels() {
  const { config } = state;
  $('#calendar-url').value = config.calendarUrl;
  $('#teams-status').textContent = config.teamsEnabled ? 'Für euren Kanal aktiv' : 'Noch nicht eingerichtet';
  $('#teams-status').classList.toggle('unavailable', !config.teamsEnabled);
  $('#teams-hint').hidden = config.teamsEnabled;
  $('#teams-sidebar-status').textContent = config.teamsEnabled ? 'Teams-Webhook ist eingerichtet.' : 'Teams-Webhook noch nicht eingerichtet.';
}

async function load() {
  try {
    const [people, config] = await Promise.all([api('/api/employees'), api('/api/config')]);
    state.people = people; state.config = config;
    $('#load-error').hidden = true;
    render(); renderChannels();
    return true;
  } catch {
    $('#load-error').hidden = false;
    if (!state.config) {
      $('#next-name').textContent = 'Keine Verbindung';
      $('#next-status').textContent = 'zum Server.';
      $('#next-date').textContent = 'Bitte versuche es erneut.';
      $('#directory .loading-message')?.replaceChildren(document.createTextNode('Die Mitarbeiter konnten nicht geladen werden.'));
    }
    return false;
  }
}

function openPerson(id) {
  const person = state.people.find(person => person.id === id);
  $('#person-form').reset(); message('#person-error', '');
  $('#person-id').value = person?.id || '';
  $('#person-title').textContent = person ? 'Geburtstag bearbeiten' : 'Geburtstag hinzufügen';
  $('#person-name').value = person?.name || '';
  $('#person-day').value = person?.day || '';
  $('#person-month').value = person?.month || '';
  $('#person-year').value = person?.year || '';
  $('#person-dialog').showModal(); $('#person-name').focus();
}

for (let i = 0; i < 12; i++) $('#person-month').add(new Option(months[i], String(i + 1)));
for (let i = 0; i < 12; i++) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'month-button'; button.dataset.month = String(i + 1);
  button.textContent = months[i].slice(0, 3); button.setAttribute('aria-pressed', 'false');
  $('#month-grid').append(button);
}
$('#person-year').max = new Date().getFullYear();

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) close.closest('dialog').close();
  const actionButton = event.target.closest('[data-action]');
  const action = actionButton?.dataset.action;
  if (action === 'add') openPerson();
  if (action === 'reload') await load();
  if (action === 'subscribe') {
    if (!state.config && !await load()) return toast('Gerade keine Verbindung. Bitte versuche es erneut.');
    $('#subscribe-dialog').showModal();
    const channel = actionButton.dataset.channel;
    if (channel) $(`#${channel}-option`).focus();
  }
  const edit = event.target.closest('[data-edit]');
  if (edit) openPerson(edit.dataset.edit);
  const remove = event.target.closest('[data-delete]');
  if (remove) {
    const person = state.people.find(person => person.id === remove.dataset.delete);
    state.deleteId = person.id; message('#delete-error', '');
    $('#delete-text').textContent = `Der Geburtstag von ${person.name} wird aus dem Verzeichnis und dem Kalenderfeed entfernt.`;
    $('#delete-dialog').showModal();
  }
  const tab = event.target.closest('[data-month]');
  if (tab) {
    state.filter = tab.dataset.month === state.filter && tab.classList.contains('month-button') ? 'all' : tab.dataset.month;
    render();
  }
});

$('#search').addEventListener('input', event => { state.search = event.target.value.trim().toLocaleLowerCase('de'); render(); });
$('#person-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; message('#person-error', '');
  const id = $('#person-id').value;
  try {
    await api(id ? `/api/employees/${id}` : '/api/employees', { method: id ? 'PUT' : 'POST', body: {
      name: $('#person-name').value, day: Number($('#person-day').value), month: Number($('#person-month').value),
      year: $('#person-year').value ? Number($('#person-year').value) : null,
    } });
    $('#person-dialog').close(); await load(); toast(id ? 'Geburtstag aktualisiert.' : 'Geburtstag gespeichert.');
  } catch (error) { message('#person-error', error.message, true); }
  finally { button.disabled = false; }
});

$('#confirm-delete').addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true;
  try {
    await api(`/api/employees/${state.deleteId}`, { method: 'DELETE', body: {} });
    $('#delete-dialog').close(); await load(); toast('Der Eintrag wurde entfernt.');
  } catch (error) { message('#delete-error', error.message, true); }
  finally { button.disabled = false; }
});

$('#copy-calendar').addEventListener('click', async () => {
  const input = $('#calendar-url');
  try { await navigator.clipboard.writeText(input.value); toast('Kalenderlink kopiert. Jetzt in deinem Kalender abonnieren.'); }
  catch { input.focus(); input.select(); toast('Bitte den markierten Link mit Strg+C oder langem Tippen kopieren.'); }
});

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}
function updateNavigation() {
  document.querySelectorAll('.site-header nav a').forEach(link => link.classList.toggle('nav-active', link.hash === (location.hash || '#overview')));
}
window.addEventListener('hashchange', updateNavigation); updateNavigation();
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) load(); }, 60000);
load();
