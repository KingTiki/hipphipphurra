# Sicherheit

## Unterstützte Versionen

Unterstützt wird das jeweils neueste stabile Release. Sicherheitskorrekturen
werden als neues Release veröffentlicht; ältere Versionen erhalten keine
separaten Sicherheitsupdates. Vorabversionen sind für Tests vorgesehen.

## Schwachstellen melden

Sicherheitslücken bitte im GitHub-Repository über **Security → Report a vulnerability**
privat melden. Die Meldung sollte die betroffene Version, eine Beschreibung und
Schritte zur Reproduktion mit fiktiven Daten enthalten.

Falls diese Funktion im Repository nicht verfügbar ist, steht derzeit kein
privater Meldeweg bereit. Bitte keine vertraulichen Details, Zugangsdaten oder
personenbezogenen Daten in öffentlichen Issues veröffentlichen.

## Zugriffsmodell

Hipphipphurra hat keine Anmeldung oder Rollen. Jeder, der die Anwendung erreicht,
kann alle Mitarbeiterdaten lesen, ändern und löschen. Auch der Kalenderfeed ist
ohne Anmeldung abrufbar. Origin- und Header-Prüfungen ersetzen keine Anmeldung.

Den Zugriff deshalb auf den vorgesehenen Personenkreis begrenzen, etwa über
Netzwerkregeln oder eine vorgeschaltete Anmeldung. Hinweise zum Betrieb und zum
Umgang mit Geheimnissen stehen in der [README](README.md#sicherer-betrieb).
