import { createOverview, filterEmployees } from './view-model.js';
import { birthdayDate, detectLanguage, initialLanguage, localeFor, monthNames, saveLanguage, translate } from './i18n.js';

const $ = selector => document.querySelector(selector);
// Accessing localStorage itself can throw in restricted browser contexts.
let storage;
try { storage = window.localStorage; } catch { /* Use browser preferences for this visit. */ }
const initial = initialLanguage(navigator, storage);
const colors = ['lavender', 'sage', 'peach', 'butter'];
const state = { people: [], config: null, filter: 'all', search: '', deleteId: null, toastTimer: null,
  language: initial.language, preference: initial.preference, loadFailed: false, errors: {} };
const t = (key, values) => translate(state.language, key, values);
const counted = (key, count) => t(`${key}_${count === 1 ? 'one' : 'other'}`, { count });
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const initials = name => name.trim().split(/\s+/).filter(Boolean).filter((_, i, list) => i === 0 || i === list.length - 1)
  .map(part => [...part][0]).join('').toLocaleUpperCase(localeFor(state.language)).slice(0, 2);
const color = name => colors[[...name].reduce((sum, char) => sum + char.codePointAt(0), 0) % colors.length];
const avatar = person => `<span class="avatar ${color(person.name)}" aria-hidden="true">${escapeHtml(initials(person.name))}</span>`;
const countdown = days => days === 0 ? t('today') : days === 1 ? t('tomorrow') : t('inDays', { count: days });
const ageLabel = person => person.turningAge === null ? '' : ` · ${t(person.isToday ? 'ageToday' : 'ageUpcoming', { age: person.turningAge })}`;

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, { method, headers: { 'Accept-Language': state.language,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Kuchenzeit': '1' }) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || t('error.internal'));
    error.code = result.code || 'internal'; error.params = result.params;
    throw error;
  }
  return result;
}

function toast(key) {
  clearTimeout(state.toastTimer);
  state.toastKey = key;
  $('#toast').textContent = t(key); $('#toast').hidden = false;
  state.toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}

function message(selector, error) {
  state.errors[selector] = error;
  const element = $(selector);
  const key = `error.${error?.code || 'internal'}`;
  const text = t(key, error?.params);
  element.textContent = error ? text === key ? t('error.internal') : text : '';
  element.hidden = !error;
  element.classList.toggle('error', Boolean(error));
}

function render() {
  const months = monthNames(state.language);
  const currentMonth = state.config ? Number(state.config.today.split('-')[1])
    : Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Berlin', month: 'numeric' }).format(new Date()));
  const overview = createOverview(state.people, currentMonth, localeFor(state.language));
  const { next, cohort } = overview;
  $('#next-name').textContent = next?.name || t('emptyName');
  $('#next-name').title = next?.name || '';
  $('#next-status').textContent = t(next ? next.isToday ? 'todayStatus' : 'soonStatus' : 'emptyStatus');
  $('#next-date').textContent = next ? birthdayDate(state.language, next) + ageLabel(next) : t('emptyDate');
  $('#next-days').textContent = next?.daysUntil ?? '–';
  $('#next-days-label').textContent = t(next ? next.isToday ? 'birthdayToday' : next.daysUntil === 1 ? 'dayUntil' : 'days' : 'noDate');
  $('#next-peers').hidden = cohort.length < 2;
  $('#next-peers').textContent = cohort.length > 1 ? t('peers', { names: cohort.filter(person => person.id !== next.id).map(person => person.name).join(', ') }) : '';
  $('.hero').classList.toggle('is-today', Boolean(next?.isToday));
  for (const button of document.querySelectorAll('[data-month]')) {
    const month = Number(button.dataset.month);
    const selectedMonth = state.filter === 'current' ? currentMonth : Number(state.filter);
    const selected = month ? month === selectedMonth : button.dataset.month === state.filter;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    if (month) {
      const count = overview.monthCounts[month - 1];
      button.classList.toggle('has-birthdays', count > 0); button.classList.toggle('is-current', month === currentMonth);
      const label = `${months[month - 1]}: ${counted('birthday', count)}${month === currentMonth ? t('currentMonthSuffix') : ''}`;
      button.setAttribute('aria-label', label); button.title = label;
    }
  }
  $('#year-summary').textContent = t('yearSummary', { birthdays: counted('birthday', overview.total),
    detail: overview.currentMonthCount ? t('birthdaysThisMonth', { count: overview.currentMonthCount, month: months[currentMonth - 1] }) : t('noBirthdaysThisMonth') });
  const filtered = filterEmployees(state.people, { month: state.filter, currentMonth, search: state.search, locale: localeFor(state.language) });
  $('#directory-count').textContent = counted('employee', filtered.length);
  $('#directory').innerHTML = filtered.length ? months.map((month, index) => {
    const people = filtered.filter(person => person.month === index + 1).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, localeFor(state.language)));
    if (!people.length) return '';
    return `<section class="month-group" aria-label="${escapeHtml(t('birthdaysIn', { month }))}"><h3 class="month-heading">${month}<span>· ${counted('birthday', people.length)}</span></h3>${people.map(person => `
      <div class="employee-row">${avatar(person)}<div class="employee-details"><span class="employee-name">${escapeHtml(person.name)}</span>
      <span class="employee-date">${birthdayDate(state.language, person)}${ageLabel(person)}</span></div>
      <span class="employee-countdown${person.isToday ? ' today' : person.id === next?.id ? ' is-next' : ''}">${countdown(person.daysUntil)}</span>
      <div class="row-actions"><button class="icon-button" data-edit="${person.id}" aria-label="${escapeHtml(t('editPerson', { name: person.name }))}" title="${t('edit')}">${icon('edit')}</button><button class="icon-button delete-button" data-delete="${person.id}" aria-label="${escapeHtml(t('deletePerson', { name: person.name }))}" title="${t('remove')}">${icon('trash')}</button></div></div>`).join('')}</section>`;
  }).join('') : `<div class="directory-empty">${icon(state.search ? 'search' : 'calendar')}<strong>${t(state.search ? 'noSearchResults' : state.people.length ? 'noMonthResults' : 'noEmployees')}</strong>${t(state.search ? 'searchHint' : state.people.length ? 'monthHint' : 'emptyHint')}</div>`;
}

function renderChannels() {
  const { config } = state;
  if (!config) return;
  const calendarUrl = new URL(config.calendarUrl);
  calendarUrl.searchParams.set('lang', state.language);
  $('#calendar-url').value = calendarUrl.href;
  $('#download-calendar').href = `/calendar.ics?lang=${state.language}`;
  $('#teams-status').textContent = t(config.teamsEnabled ? 'teamsActive' : 'teamsInactive');
  $('#teams-status').classList.toggle('unavailable', !config.teamsEnabled);
  $('#teams-hint').hidden = config.teamsEnabled;
  $('#teams-sidebar-status').textContent = t(config.teamsEnabled ? 'teamsSidebarActive' : 'teamsSidebarInactive');
}

function renderLoadState() {
  $('#load-error').hidden = !state.loadFailed;
  if (state.config) render();
  else if (state.loadFailed) {
    $('#next-name').textContent = t('connectionName'); $('#next-status').textContent = t('connectionStatus');
    $('#next-date').textContent = t('connectionRetry'); $('#directory').textContent = t('employeesLoadError');
  }
}

function renderDialogs() {
  $('#person-title').textContent = t($('#person-id').value ? 'editBirthday' : 'addBirthday');
  const person = state.people.find(person => person.id === state.deleteId);
  if (person) $('#delete-text').textContent = t('deleteDescription', { name: person.name });
  for (const [selector, error] of Object.entries(state.errors)) message(selector, error);
}

function applyLanguage() {
  document.documentElement.lang = state.language; document.title = t('pageTitle');
  $('meta[name="description"]').content = t('pageDescription');
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const attribute of ['aria-label', 'placeholder']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
  $('#language').value = state.preference;
  if (!state.config) $('#directory-count').textContent = counted('employee', 0);
  const selectedMonth = $('#person-month').value;
  $('#person-month').replaceChildren(new Option(t('chooseMonth'), ''), ...monthNames(state.language).map((name, i) => new Option(name, String(i + 1))));
  $('#person-month').value = selectedMonth;
  monthNames(state.language, 'short').forEach((name, i) => { $(`#month-grid [data-month="${i + 1}"]`).textContent = name; });
  if (state.toastKey) $('#toast').textContent = t(state.toastKey);
  renderLoadState(); renderChannels(); renderDialogs();
}

async function load() {
  try {
    const [people, config] = await Promise.all([api('/api/employees'), api('/api/config')]);
    state.people = people; state.config = config; state.loadFailed = false;
    renderLoadState(); renderChannels(); return true;
  } catch { state.loadFailed = true; renderLoadState(); return false; }
}

function openPerson(id) {
  const person = state.people.find(person => person.id === id);
  $('#person-form').reset(); message('#person-error', null);
  $('#person-id').value = person?.id || '';
  $('#person-name').value = person?.name || ''; $('#person-day').value = person?.day || '';
  $('#person-month').value = person?.month || ''; $('#person-year').value = person?.year || '';
  renderDialogs(); $('#person-dialog').showModal(); $('#person-name').focus();
}

for (let i = 0; i < 12; i++) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'month-button'; button.dataset.month = String(i + 1);
  button.setAttribute('aria-pressed', 'false'); $('#month-grid').append(button);
}
$('#person-year').max = new Date().getFullYear();
applyLanguage();
$('#language').addEventListener('change', event => {
  state.preference = event.target.value;
  state.language = state.preference === 'auto' ? detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]) : state.preference;
  saveLanguage(state.preference, storage); applyLanguage();
});
window.addEventListener('languagechange', () => {
  if (state.preference === 'auto') { state.language = detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]); applyLanguage(); }
});

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) close.closest('dialog').close();
  const actionButton = event.target.closest('[data-action]');
  const action = actionButton?.dataset.action;
  if (action === 'add') openPerson();
  if (action === 'reload') await load();
  if (action === 'subscribe') {
    if (!state.config && !await load()) return toast('connectionError');
    $('#subscribe-dialog').showModal();
    const channel = actionButton.dataset.channel;
    if (channel) $(`#${channel}-option`).focus();
  }
  const edit = event.target.closest('[data-edit]');
  if (edit) openPerson(edit.dataset.edit);
  const remove = event.target.closest('[data-delete]');
  if (remove) {
    state.deleteId = remove.dataset.delete; message('#delete-error', null); renderDialogs();
    $('#delete-dialog').showModal();
  }
  const tab = event.target.closest('[data-month]');
  if (tab && state.config) {
    state.filter = tab.dataset.month === state.filter && tab.classList.contains('month-button') ? 'all' : tab.dataset.month; render();
  }
});

$('#search').addEventListener('input', event => { state.search = event.target.value.trim(); if (state.config) render(); });
$('#person-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; message('#person-error', null);
  const id = $('#person-id').value;
  try {
    await api(id ? `/api/employees/${id}` : '/api/employees', { method: id ? 'PUT' : 'POST', body: {
      name: $('#person-name').value, day: Number($('#person-day').value), month: Number($('#person-month').value),
      year: $('#person-year').value ? Number($('#person-year').value) : null,
    } });
    $('#person-dialog').close(); await load(); toast(id ? 'updated' : 'saved');
  } catch (error) { message('#person-error', error); }
  finally { button.disabled = false; }
});

$('#confirm-delete').addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true;
  try {
    await api(`/api/employees/${state.deleteId}`, { method: 'DELETE', body: {} });
    $('#delete-dialog').close(); await load(); toast('removed');
  } catch (error) { message('#delete-error', error); }
  finally { button.disabled = false; }
});

$('#copy-calendar').addEventListener('click', async () => {
  const input = $('#calendar-url');
  try { await navigator.clipboard.writeText(input.value); toast('copied'); }
  catch { input.focus(); input.select(); toast('copyManually'); }
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
