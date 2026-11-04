# Mitwirken

## Entwicklung

Node.js 24.15 oder neuer aus der 24er-Reihe, Git und optional Docker verwenden.
Frontend: HTML, CSS und Vanilla JavaScript. Backend: Node.js und SQLite.
Es gibt keine npm-Abhängigkeiten und keinen Frontend-Build.

```sh
npm start
npm run dev
```

`start` startet den Server, `dev` startet ihn mit automatischem Neustart.
Eine lokale `.env` lässt sich beim direkten Node-Start so laden:

```sh
node --env-file=.env src/server.js
```

Für den direkten Start: `PORT=3000`, `HOST=0.0.0.0`, `DATA_DIR=./data` sind die
Standardwerte. Bei gesperrten PowerShell-Skripten unter Windows `npm.cmd` verwenden.

Aus dem Quellcode mit Docker bauen und starten:

```sh
docker compose -f compose.build.yaml up -d --build
```

Für das fertige GHCR-Image genügt `docker compose up -d`. Beide Varianten
verwenden denselben Datenordner und Dienstnamen. `compose.build.yaml` ist eine
eigenständige Alternative; die Dateien werden nicht miteinander kombiniert.

## Prüfungen

```sh
npm test
npm run check:repo
docker compose -f compose.build.yaml config --quiet
docker build -t hipphipphurra:local .
node scripts/docker-smoke.mjs
```

Die Tests verwenden fiktive Personen, isolierte Datenbanken und simulierte
Teams-Ziele. Der Docker-Test prüft HTTP, Kalender, Lizenzdateien, Nicht-Root-Betrieb
und Datenerhalt nach einem Neustart. Seine Testcontainer und Testvolumes werden
anschließend entfernt.

`check:repo` prüft die aktuellen Git-Kandidaten einschließlich vorgemerkter Inhalte
auf private Dateien und bekannte Zugangsdaten-Muster. Außerdem prüft es
Font-Lizenzen und dokumentierte Prüfsummen. Die frühere Git-Historie wird nicht
untersucht.

## Konfiguration

| Variable | Standard | Verwendung |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | Erreichbare Adresse ohne Unterpfad; für Kalender- und Nachrichtenlinks |
| `HTTP_PORT` | `3000` | Veröffentlichter Port bei Compose |
| `BIND_ADDRESS` | `127.0.0.1` | Bind-Adresse bei Compose |
| `TEAMS_WEBHOOK_URL` | leer | Geheime HTTPS-URL des Teams-Workflows |
| `IMAGE` | leer | Pflicht bei `compose.yaml`: Image-Adresse mit Tag |

Docker Compose liest `.env` automatisch. Nach Änderungen `docker compose up -d`
bzw. beim Quellcode-Build `docker compose -f compose.build.yaml up -d --build`
ausführen. Bei anderem Port
`HTTP_PORT` und `BASE_URL` gemeinsam anpassen. Hinter einem Reverse Proxy die
öffentliche HTTPS-Adresse als `BASE_URL` verwenden. Unterpfade werden nicht
unterstützt.

## Kalenderabo

In der Anwendung **Abonnieren → Im Kalender** öffnen und `/calendar.ics` abonnieren.
In Outlook: **Kalender hinzufügen → Aus dem Internet abonnieren**.
In Apple Kalender: **Ablage → Neues Kalenderabonnement**.

- Ein Abo übernimmt neue, geänderte und entfernte Einträge beim nächsten Abruf.
- Ein ICS-Import ist eine Momentaufnahme ohne automatische Aktualisierung.
- Outlook führt das Abo als eigenen Kalender. Die Überlagerungsansicht zeigt
  ihn gemeinsam mit dem Hauptkalender.
- Kalenderprogramm und Dienst bestimmen Aktualisierung und Erinnerungen.
  Der Feed garantiert keine Benachrichtigung um 08:00 Uhr.
- Die abrufende Instanz muss die Adresse erreichen können. Microsoft-/Google-
  Dienste können reine Intranet-Adressen gegebenenfalls nicht abrufen.

## Teams-Webhook

1. Im Teams-Kanal **Workflows** öffnen.
2. Eine Vorlage wie **Webhookwarnungen an einen Kanal senden / Send webhook alerts
   to a channel** mit **When a Teams webhook request is received** wählen.
   Der Workflow muss Adaptive Cards unterstützen.
3. Kanal und ausführendes Konto wählen. Die aktuelle Anbindung benötigt die
   Aufrufer-Einstellung **Anyone/Jeder**; die geheime URL autorisiert den Aufruf.
4. HTTPS-URL als `TEAMS_WEBHOOK_URL` in `.env` hinterlegen und den Container
   mit Compose aktualisieren.

Ein weiterer Workflow-Besitzer erleichtert die Weiterbetreuung. Tenant-Richtlinien
können diese Einrichtung einschränken. Alle Kanalmitglieder sehen dieselbe
Nachricht; persönliche Teams-Abos werden nicht benötigt.
[Microsoft-Dokumentation](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=dotnet)

## Daten und Betrieb

| Umgebung | Datenbank |
| --- | --- |
| Container | `/data/kuchenzeit.sqlite` |
| Compose-Host | `data/kuchenzeit.sqlite` im Projektverzeichnis |
| Direkter Node-Start | `./data/kuchenzeit.sqlite`, anpassbar über `DATA_DIR` |

Eine Instanz betreiben. Der Dienstname `kuchenzeit`, der Datenbankname,
Kalender-Termin-IDs und der API-Header `X-Kuchenzeit` bleiben für bestehende
Installationen stabil. Migrationen laufen beim Start automatisch.

### Erinnerungen

- Prüfung jede Minute; Teams-Versand am Geburtstag um 08:00 Uhr `Europe/Berlin`,
  auch am Wochenende. Sommer-/Winterzeit wird berücksichtigt.
- Ohne Geburtstag keine Nachricht. Nach einem Start nach 08:00 Uhr werden nur
  ausstehende Nachrichten des aktuellen Tages nachgeholt.
- Neue Einträge nach 08:00 Uhr werden berücksichtigt, sofern für den Tag noch
  keine Teams-Nachricht verschickt wurde.
- Fehlversuche werden nach fünf Minuten wiederholt, höchstens dreimal pro Tag.
  Erfolgreiche Zustellungen bleiben über Neustarts gespeichert.
- Bei unklaren Webhook-Fehlern oder einem Absturz zwischen Zustellung und
  Bestätigung kann eine doppelte Nachricht entstehen.
- Der 29. Februar wird in Nichtschaltjahren am 28. Februar berücksichtigt,
  auch im Kalenderfeed.

### Updates und Sicherung

Image aktualisieren:

```sh
docker compose pull
docker compose up -d
```

Für Quellcode-Installationen nach dem Update `docker compose -f compose.build.yaml up -d --build`
ausführen. Vor Updates sichern; ältere Programmstände können neuere
Datenbankschemata zurückweisen.

Zur Sicherung die Anwendung stoppen, das vollständige Verzeichnis `data/` kopieren
und die Anwendung wieder starten. `.env` separat und vertraulich sichern.
Die laufende SQLite-Hauptdatei allein genügt wegen möglicher WAL-Dateien nicht.
Beim Wiederherstellen Schreibrechte für UID/GID 1000 beachten.

Logs: `docker compose logs -f`. Bei Quellcode-Installationen jeweils
`-f compose.build.yaml` vor dem Unterbefehl ergänzen. `GET /health` prüft HTTP und Datenbankzugriff,
nicht die externe Teams-Verbindung. Logs enthalten keine Webhook-URL.

## GitHub und Releases

Pushes auf Branches, Pull Requests und manuelle CI-Läufe prüfen Repository und
Tests unter Linux und Windows. Docker-Images werden nur beim Veröffentlichen
eines GitHub-Releases gebaut und nach erfolgreichen Prüfungen nach
`ghcr.io/<konto>/<repository>` hochgeladen. Das Image unterstützt Linux/amd64.

| Auslöser | Tags |
| --- | --- |
| Stabiles Release veröffentlicht, z. B. `v1.0.0` | `1.0.0`, `latest`, Commit-Tag |
| Vorabversion veröffentlicht, z. B. `v1.1.0-rc.1` | `1.1.0-rc.1`, Commit-Tag |
| Branch-Push, Pull Request oder manueller CI-Lauf | Nur Prüfungen, kein Image-Build |
| Tag-Push ohne Release oder Release-Entwurf | Keine Veröffentlichung |

Zum Veröffentlichen unter **GitHub → Releases → Draft a new release** einen Tag
wie `v1.0.0` auswählen oder neu anlegen und **Publish release** ausführen.
Ein Tag-Push allein genügt nicht. Die CI prüft den Code des Release-Tags und
testet das Release-Image vor dem Upload. Jedes Image erhält zusätzlich
`sha-<vollständige-commit-sha>`; Repository-URL und Commit-SHA stehen in den OCI-Labels.

Erlaubt sind `vMAJOR.MINOR.PATCH` und optionale Vorabversionen wie
`v1.0.0-rc.1`, aber keine Build-Metadaten mit `+`. Nur stabile Releases aktualisieren
`latest`. Die GitHub-Markierung als Vorabversion oder ein Vorabversionssuffix
im Tag verhindert das Aktualisieren von `latest`.

Der Publish-Job nutzt den automatisch bereitgestellten `GITHUB_TOKEN` mit
`packages: write`. Ein eigener Token ist nicht nötig. Pull-Request-Prüfungen
melden sich nicht an der Registry an. Actions und Docker-Basisimage sind fest
gepinnt; Dependabot prüft sie monatlich.

Neue GHCR-Pakete sind zunächst privat. Für Downloads ohne Anmeldung nach der
ersten Veröffentlichung unter **Packages → Paket → Package settings → Change
visibility** auf **Public** stellen. Private Images benötigen `docker login ghcr.io`.
[GitHub-Dokumentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

Nach Anlegen des GitHub-Repositories können CI-Pflichtprüfungen und private
Sicherheitsmeldungen aktiviert werden. GitHub Pages führt diesen Node-Server
mit SQLite und Scheduler nicht aus.

## Schnittstellen

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `/api/employees` | Mitarbeiter mit nächstem Datum und Altersberechnung |
| POST | `/api/employees` | Mitarbeiter anlegen |
| PUT / DELETE | `/api/employees/:id` | Mitarbeiter ändern / löschen |
| GET | `/api/config` | Kalenderlink und Teams-Verfügbarkeit |
| GET | `/calendar.ics` | Kalenderfeed |
| GET | `/health` | Healthcheck |

Schreibzugriffe benötigen `Content-Type: application/json` und `X-Kuchenzeit: 1`.
Beispiel: `{ "name": "Alex Beispiel", "day": 15, "month": 6, "year": null }`.

## Beiträge

- Im Pull Request Änderung und ausgeführte Prüfungen beschreiben.
- Änderungen an Datumsermittlung, Kalender, Versand und Migrationen testen.
- Nur fiktive Personen in Tests, Beispielen und Screenshots verwenden.
- `.env`, Datenbanken, Sicherungen, Zugangsdaten und Design-Exporte lokal halten.
  `.gitignore` entfernt keine Dateien aus einer bestehenden Git-Historie.
- Für Fremdmaterialien Herkunft und Lizenz in `THIRD_PARTY_NOTICES.md` ergänzen.
  Font-Lizenzen unverändert mitliefern.
- Beiträge am Projektcode stehen unter MIT; Fremdmaterialien behalten ihre Lizenz.

Sicherheitsmeldungen und Betriebsgrenzen: [SECURITY.md](SECURITY.md).
