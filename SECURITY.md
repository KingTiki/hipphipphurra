# Sicherheit

## Vorgesehener Betrieb

Hipphipphurra ist eine Anwendung für ein vertrauenswürdiges internes Netz.
Es gibt keine Anmeldung oder Rollen: Jeder mit Zugriff kann Mitarbeiterdaten
lesen, ändern und löschen. Auch der Kalenderfeed ist ohne Anmeldung lesbar.
Die Anwendung deshalb nur intern oder hinter einer vorgeschalteten
Zugriffskontrolle betreiben. HTTPS kann ein Reverse Proxy übernehmen.

Die Origin- und Header-Prüfung der JSON-Endpunkte dient dem Schutz vor fremden
Browser-Anfragen; sie ist keine Benutzer-Authentifizierung.

Die Teams-Webhook-URL ist ein Geheimnis. Lokal in `.env` bzw. in der
Deployment-Konfiguration speichern, niemals in Issues, Screenshots, Logs oder
Quellcode veröffentlichen. Bei Veröffentlichung die URL im Teams-Workflow
ersetzen. Das Entfernen einer Datei aus dem aktuellen Git-Stand entfernt sie
nicht aus bereits veröffentlichten Commits.

Für eine Veröffentlichung des Quellcodes werden keine echten Mitarbeiterdaten
benötigt. Der lokale Datenordner und alle Datenbanksicherungen bleiben privat.
Betreiber sind für Zugriffsrechte, Datensicherung und den Umgang mit den
gespeicherten Mitarbeiterdaten verantwortlich.

## Schwachstellen melden

Falls im GitHub-Repository private Sicherheitsmeldungen aktiviert sind, bitte
**Security → Report a vulnerability** verwenden. Andernfalls zunächst ein Issue
mit der Bitte um einen privaten Meldeweg öffnen, ohne Zugangsdaten, personenbezogene
Daten oder ausnutzbare technische Details offenzulegen.

Sicherheitskorrekturen werden für den aktuellen Stand des Standardbranches
bereitgestellt. Separate ältere Release-Zweige werden derzeit nicht gepflegt.
