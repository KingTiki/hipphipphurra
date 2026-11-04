# Hipphipphurra

## Kurzbeschreibung

Geburtstage der Abteilung verwalten, als Kalender abonnieren und per Teams-Webhook
erinnern lassen. Ohne Anmeldung, für den internen Einsatz.

## Docker-Compose-Setup

[compose.yaml](compose.yaml) und [.env.example](.env.example) herunterladen.
Die Beispieldatei als `.env` speichern und die Image-Adresse anpassen:

```dotenv
IMAGE=ghcr.io/dein-account/dein-repository:latest
BASE_URL=http://localhost:3000
TEAMS_WEBHOOK_URL=
```

Konto und Repository kleinschreiben. `latest` folgt dem zuletzt veröffentlichten
stabilen Release. `TEAMS_WEBHOOK_URL` ist optional.

Unter Linux vor dem ersten Start:

```sh
mkdir -p data
sudo chown 1000:1000 data
```

Starten:

```sh
docker compose up -d
```

Aufrufen unter **http://localhost:3000**. Die Daten liegen dauerhaft in `./data`.
Für Zugriff im internen Netz `BIND_ADDRESS=0.0.0.0` und die erreichbare
Serveradresse als `BASE_URL` setzen. Das fertige Image unterstützt Linux/amd64.

## Lizenzen

- Projektcode und Grafiken: [MIT](LICENSE).
- Bricolage Grotesque und DM Sans: SIL Open Font License 1.1.
  Herkunft und Lizenztexte: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Entwicklung und Projektpflege: [CONTRIBUTING.md](CONTRIBUTING.md).
