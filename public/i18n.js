export const supportedLanguages = ['en', 'de'];

// Match browser preferences in order, including regional variants such as de-CH.
export function detectLanguage(preferences = []) {
  for (const preference of preferences) {
    const language = String(preference).toLowerCase().split(/[-_]/)[0];
    if (supportedLanguages.includes(language)) return language;
  }
  return 'en';
}

export function initialLanguage(browser, storage) {
  let preference = 'auto';
  try {
    const saved = storage?.getItem('hipphipphurra.language');
    if (supportedLanguages.includes(saved)) preference = saved;
  } catch { /* Language selection also works when storage is unavailable. */ }
  return { preference, language: preference === 'auto'
    ? detectLanguage(browser.languages?.length ? browser.languages : [browser.language]) : preference };
}

export function saveLanguage(preference, storage) {
  try {
    if (supportedLanguages.includes(preference)) storage?.setItem('hipphipphurra.language', preference);
    else storage?.removeItem('hipphipphurra.language');
  } catch { /* Keep the selection for this visit even without persistent storage. */ }
}

export const messages = {
  en: {
    pageTitle: 'Hipphipphurra · Team birthdays',
    pageDescription: 'Manage team birthdays and subscribe to reminders.',
    home: 'Hipphipphurra home', navigation: 'Main navigation', overview: 'Overview', allBirthdays: 'All birthdays',
    subscribe: 'Subscribe', language: 'Language', automatic: 'Browser (automatic)', heading: 'Team birthdays',
    birthdayOverview: 'Birthday overview', next: 'Up next', loadingName: 'Birthdays', loadingStatus: 'are loading.',
    loadingDate: 'Just a moment …', days: 'Days until the birthday', yearTitle: 'The year at a glance',
    monthGrid: 'Filter employees by birthday month', loadingBirthdays: 'Loading birthdays …',
    yearHint: 'Select a month to filter the employee list.', employees: 'All employees', add: 'Add',
    addBirthday: 'Add birthday', searchPlaceholder: 'Search by name …', searchLabel: 'Search employees by name',
    monthFilter: 'Month filter', allMonths: 'All months', currentMonth: 'This month',
    loadingEmployees: 'Loading employees …', subscribeTitle: 'Subscribe to birthdays',
    sidebarIntro: 'One subscription for all employees. New entries appear automatically.',
    subscribeCalendar: 'Subscribe to calendar', teamsWebhook: 'Teams webhook', loadingTeams: 'Loading Teams status …',
    loadError: 'Birthdays could not be loaded.', retry: 'Try again', footer: 'Hipphipphurra · Internal birthday calendar',
    footerChannels: 'Calendar · Teams', close: 'Close dialog', employee: 'Employee',
    personIntro: 'Enter a name and date. The birth year is optional.', name: 'Name', namePlaceholder: 'For example: Alex Smith',
    day: 'Day', dayPlaceholder: 'DD', month: 'Month', chooseMonth: 'Choose a month', year: 'Year',
    optional: 'optional', yearPlaceholder: 'YYYY', ageNote: 'Add a birth year to display the age.',
    cancel: 'Cancel', saveBirthday: 'Save birthday', reminders: 'Reminders',
    subscriptionIntro: 'Every subscription includes all employees in the directory.',
    inCalendar: 'In your calendar', available: 'Available',
    calendarIntro: 'Birthdays appear as all-day events. Add this link as a calendar subscription in your calendar app.',
    calendarUrl: 'Calendar subscription URL', copy: 'Copy', howItWorks: 'How does it work?',
    calendarInstructions: 'In Outlook: “Add calendar” → “Subscribe from web”. In Apple Calendar: “File” → “New Calendar Subscription”. Paste the link and subscribe.',
    calendarLimitations: 'Your calendar app controls updates and reminders. It must be able to reach the internal address; cloud services from Microsoft or Google may not be able to access it.',
    downloadCalendar: 'Download a one-off ICS file instead', snapshot: 'A download is a snapshot and does not update automatically.',
    inTeams: 'In Microsoft Teams', loading: 'Loading',
    teamsDescription: 'A message in your Teams channel at 08:00 when someone has a birthday.',
    teamsHint: 'Create a Teams workflow using “Send webhook alerts to a channel” and add its URL to the server configuration. Birthday messages will then be sent to everyone in the channel automatically.',
    timeZone: 'All delivery times use Europe/Berlin.', deleteTitle: 'Remove entry?', keep: 'Keep entry', deleteEntry: 'Delete entry',
    emptyName: 'No', emptyStatus: 'entries yet.', todayStatus: 'celebrates today.', soonStatus: 'celebrates soon.',
    emptyDate: 'Add an employee and birthday below.', birthdayToday: 'Today is the birthday', dayUntil: 'Day until the birthday',
    noDate: 'No upcoming date yet', peers: 'On the same day: {names}',
    birthday_one: '{count} birthday', birthday_other: '{count} birthdays', currentMonthSuffix: ' (current month)',
    yearSummary: '{birthdays} in the team. {detail}', noBirthdaysThisMonth: 'No birthdays this month.',
    birthdaysThisMonth: '{count} in {month}.', employee_one: '{count} employee', employee_other: '{count} employees',
    birthdaysIn: 'Birthdays in {month}', today: 'Today', tomorrow: 'Tomorrow', inDays: 'In {count} days',
    ageToday: '{age} years old', ageUpcoming: 'turning {age}', edit: 'Edit', remove: 'Delete',
    editPerson: 'Edit {name}', deletePerson: 'Delete {name}',
    noSearchResults: 'No employees found.', noMonthResults: 'No birthdays in the selected month.', noEmployees: 'No employees added yet.',
    searchHint: 'Try another name.', monthHint: 'Select “All months” to see every birthday.', emptyHint: 'New entries will appear here after you add them.',
    teamsActive: 'Active for your channel', teamsInactive: 'Not set up yet',
    teamsSidebarActive: 'Teams webhook is configured.', teamsSidebarInactive: 'Teams webhook is not set up yet.',
    connectionName: 'No connection', connectionStatus: 'to the server.', connectionRetry: 'Please try again.',
    employeesLoadError: 'Employees could not be loaded.', connectionError: 'No connection right now. Please try again.',
    editBirthday: 'Edit birthday', deleteDescription: 'The birthday of {name} will be removed from the directory and the calendar feed.',
    updated: 'Birthday updated.', saved: 'Birthday saved.', removed: 'The entry has been removed.',
    copied: 'Calendar link copied. Subscribe to it in your calendar app.',
    copyManually: 'Copy the selected link with Ctrl+C or by pressing and holding.',
    'error.invalidInput': 'Please check your input.', 'error.invalidName': 'Please enter a name with no more than 120 characters.',
    'error.invalidBirthday': 'Please enter a valid birthday.', 'error.invalidYear': 'The birth year must be between 1900 and {year}.',
    'error.invalidDay': 'This day does not exist in the selected month.', 'error.futureBirthday': 'The birthday cannot be in the future.',
    'error.jsonExpected': 'JSON is required.', 'error.tooLarge': 'The request is too large.', 'error.invalidJson': 'The request contains invalid JSON.',
    'error.invalidRequest': 'Invalid request.', 'error.forbidden': 'This request is not allowed.',
    'error.deleted': 'This entry has already been deleted.', 'error.notFound': 'Nothing was found here.',
    'error.internal': 'Something went wrong. Please try again.',
    calendarTitle: 'Hipphipphurra · Birthdays', calendarBirthday: '🎂 {name}’s birthday',
    teamsTitle: '🎂 Time to celebrate!', teamsPersonAge: '{name} turns {age} today!',
    teamsPerson: 'It’s {name}’s birthday today!',
    teamsGreeting: 'Happy birthday! Wishing you a wonderful day! 🎉🥳', teamsAction: 'All birthdays',
  },
  de: {
    pageTitle: 'Hipphipphurra · Geburtstage in der Abteilung',
    pageDescription: 'Geburtstage von Mitarbeitern verwalten und Erinnerungen abonnieren.',
    home: 'Hipphipphurra Startseite', navigation: 'Hauptnavigation', overview: 'Übersicht', allBirthdays: 'Alle Geburtstage',
    subscribe: 'Abonnieren', language: 'Sprache', automatic: 'Browser (automatisch)', heading: 'Geburtstage in der Abteilung',
    birthdayOverview: 'Geburtstagsübersicht', next: 'Als Nächstes', loadingName: 'Geburtstage', loadingStatus: 'werden geladen.',
    loadingDate: 'Einen Moment …', days: 'Tage bis zum Geburtstag', yearTitle: 'Das Jahr im Blick',
    monthGrid: 'Mitarbeiter nach Geburtstagsmonat filtern', loadingBirthdays: 'Die Geburtstage werden geladen …',
    yearHint: 'Monat auswählen, um die Mitarbeiterliste zu filtern.', employees: 'Alle Mitarbeiter', add: 'Hinzufügen',
    addBirthday: 'Geburtstag hinzufügen', searchPlaceholder: 'Nach Namen suchen …', searchLabel: 'Mitarbeiter nach Namen suchen',
    monthFilter: 'Monatsfilter', allMonths: 'Alle Monate', currentMonth: 'Diesen Monat',
    loadingEmployees: 'Die Mitarbeiter werden geladen …', subscribeTitle: 'Geburtstage abonnieren',
    sidebarIntro: 'Ein Abo für alle eingetragenen Mitarbeiter. Neue Einträge erscheinen automatisch.',
    subscribeCalendar: 'Kalender abonnieren', teamsWebhook: 'Teams-Webhook', loadingTeams: 'Teams-Status wird geladen …',
    loadError: 'Die Geburtstage konnten nicht geladen werden.', retry: 'Erneut versuchen', footer: 'Hipphipphurra · Interner Geburtstagskalender',
    footerChannels: 'Kalender · Teams', close: 'Dialog schließen', employee: 'Mitarbeiter',
    personIntro: 'Name und Datum eintragen. Das Geburtsjahr ist optional.', name: 'Name', namePlaceholder: 'Zum Beispiel: Alex Müller',
    day: 'Tag', dayPlaceholder: 'TT', month: 'Monat', chooseMonth: 'Monat wählen', year: 'Jahr',
    optional: 'optional', yearPlaceholder: 'JJJJ', ageNote: 'Mit Geburtsjahr wird das Alter angezeigt.',
    cancel: 'Abbrechen', saveBirthday: 'Geburtstag speichern', reminders: 'Erinnerungen',
    subscriptionIntro: 'Alle Abos umfassen sämtliche eingetragenen Mitarbeiter.',
    inCalendar: 'Im Kalender', available: 'Verfügbar',
    calendarIntro: 'Geburtstage als ganztägige Termine. Den Link in deinem Kalender als Kalenderabo hinzufügen.',
    calendarUrl: 'Kalender-Abonnement-URL', copy: 'Kopieren', howItWorks: 'Wie funktioniert das?',
    calendarInstructions: 'In Outlook: „Kalender hinzufügen“ → „Aus dem Internet abonnieren“. In Apple Kalender: „Ablage“ → „Neues Kalenderabonnement“. Den Link einfügen und abonnieren.',
    calendarLimitations: 'Dein Kalender bestimmt Aktualisierung und Erinnerungen. Die abrufende Kalenderanwendung muss die interne Adresse erreichen können; ein Abruf durch Microsoft oder Google aus der Cloud kann deshalb scheitern.',
    downloadCalendar: 'Stattdessen einmalig als ICS herunterladen', snapshot: 'Ein Download ist eine Momentaufnahme und aktualisiert sich nicht automatisch.',
    inTeams: 'In Microsoft Teams', loading: 'Wird geladen',
    teamsDescription: 'Eine Nachricht im Teams-Kanal um 08:00 Uhr, wenn jemand Geburtstag hat.',
    teamsHint: 'Einmalig einen Teams-Workflow „Webhookwarnungen an einen Kanal senden“ anlegen und dessen URL in der Serverkonfiguration hinterlegen. Danach kommen die Nachrichten für alle im Kanal automatisch.',
    timeZone: 'Alle Versandzeiten gelten für Europe/Berlin.', deleteTitle: 'Eintrag entfernen?', keep: 'Behalten', deleteEntry: 'Eintrag löschen',
    emptyName: 'Noch keine', emptyStatus: 'Einträge.', todayStatus: 'feiert heute.', soonStatus: 'feiert bald.',
    emptyDate: 'Mitarbeiter und Geburtstag unten hinzufügen.', birthdayToday: 'Heute ist Geburtstag', dayUntil: 'Tag bis zum Geburtstag',
    noDate: 'Noch kein Termin', peers: 'Am selben Tag: {names}',
    birthday_one: '{count} Geburtstag', birthday_other: '{count} Geburtstage', currentMonthSuffix: ' (aktueller Monat)',
    yearSummary: '{birthdays} in der Abteilung. {detail}', noBirthdaysThisMonth: 'In diesem Monat stehen keine Geburtstage an.',
    birthdaysThisMonth: 'Davon {count} im {month}.', employee_one: '{count} Mitarbeiter', employee_other: '{count} Mitarbeiter',
    birthdaysIn: 'Geburtstage im {month}', today: 'Heute', tomorrow: 'Morgen', inDays: 'In {count} Tagen',
    ageToday: '{age} Jahre', ageUpcoming: 'wird {age}', edit: 'Bearbeiten', remove: 'Löschen',
    editPerson: '{name} bearbeiten', deletePerson: '{name} löschen',
    noSearchResults: 'Keine Mitarbeiter gefunden.', noMonthResults: 'Keine Geburtstage im ausgewählten Monat.', noEmployees: 'Noch keine Mitarbeiter eingetragen.',
    searchHint: 'Versuche es mit einem anderen Namen.', monthHint: 'Unter „Alle Monate“ findest du alle Geburtstage.', emptyHint: 'Neue Einträge erscheinen hier nach dem Hinzufügen.',
    teamsActive: 'Für euren Kanal aktiv', teamsInactive: 'Noch nicht eingerichtet',
    teamsSidebarActive: 'Teams-Webhook ist eingerichtet.', teamsSidebarInactive: 'Teams-Webhook noch nicht eingerichtet.',
    connectionName: 'Keine Verbindung', connectionStatus: 'zum Server.', connectionRetry: 'Bitte versuche es erneut.',
    employeesLoadError: 'Die Mitarbeiter konnten nicht geladen werden.', connectionError: 'Gerade keine Verbindung. Bitte versuche es erneut.',
    editBirthday: 'Geburtstag bearbeiten', deleteDescription: 'Der Geburtstag von {name} wird aus dem Verzeichnis und dem Kalenderfeed entfernt.',
    updated: 'Geburtstag aktualisiert.', saved: 'Geburtstag gespeichert.', removed: 'Der Eintrag wurde entfernt.',
    copied: 'Kalenderlink kopiert. Jetzt in deinem Kalender abonnieren.',
    copyManually: 'Bitte den markierten Link mit Strg+C oder langem Tippen kopieren.',
    'error.invalidInput': 'Bitte prüfe die Eingaben.', 'error.invalidName': 'Bitte einen Namen mit höchstens 120 Zeichen eingeben.',
    'error.invalidBirthday': 'Bitte einen gültigen Geburtstag eingeben.', 'error.invalidYear': 'Das Geburtsjahr muss zwischen 1900 und {year} liegen.',
    'error.invalidDay': 'Diesen Tag gibt es im gewählten Monat nicht.', 'error.futureBirthday': 'Der Geburtstag darf nicht in der Zukunft liegen.',
    'error.jsonExpected': 'JSON erwartet.', 'error.tooLarge': 'Die Anfrage ist zu groß.', 'error.invalidJson': 'Die Anfrage enthält ungültiges JSON.',
    'error.invalidRequest': 'Ungültige Anfrage.', 'error.forbidden': 'Diese Anfrage ist nicht erlaubt.',
    'error.deleted': 'Dieser Eintrag wurde bereits gelöscht.', 'error.notFound': 'Hier gibt es leider nichts zu finden.',
    'error.internal': 'Das hat leider nicht geklappt. Bitte versuche es noch einmal.',
    calendarTitle: 'Hipphipphurra · Geburtstage', calendarBirthday: '🎂 {name} hat Geburtstag',
    teamsTitle: '🎂 Heute wird gefeiert!', teamsPersonAge: '{name} wird heute {age}!',
    teamsPerson: '{name} hat heute Geburtstag!',
    teamsGreeting: 'Herzlichen Glückwunsch und einen wundervollen Geburtstag! 🎉🥳', teamsAction: 'Alle Geburtstage',
  },
};

export function translate(language, key, values = {}) {
  const template = messages[language]?.[key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

export const localeFor = language => language === 'de' ? 'de-DE' : 'en-GB';
export const monthNames = (language, format = 'long') => Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(localeFor(language), { month: format, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month, 1))));
export const birthdayDate = (language, person) => new Intl.DateTimeFormat(localeFor(language), {
  day: 'numeric', month: 'long', timeZone: 'UTC',
}).format(new Date(Date.UTC(2000, person.month - 1, person.day)));
