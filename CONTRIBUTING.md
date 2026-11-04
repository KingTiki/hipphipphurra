# Contributing

## Development

Use Node.js 24.15 or later in the 24.x series, Git, and optionally Docker.
The frontend uses HTML, CSS, and vanilla JavaScript; the backend uses Node.js and
SQLite. There are no npm dependencies and no frontend build step.

```sh
npm start
npm run dev
```

`start` runs the server; `dev` restarts it when files change.
To load a local `.env` file when running Node directly:

```sh
node --env-file=.env src/server.js
```

Direct execution defaults to `PORT=3000`, `HOST=0.0.0.0`, and `DATA_DIR=./data`.
On Windows, use `npm.cmd` if PowerShell script execution is disabled.

Build and start from source with Docker:

```sh
docker compose -f compose.build.yaml up -d --build
```

For a published GHCR image, use `docker compose up -d`. Both variants use the same
data directory and service name. `compose.build.yaml` is a standalone alternative;
do not combine the two Compose files.

## Checks

```sh
npm test
npm run check:repo
docker compose -f compose.build.yaml config --quiet
docker build -t hipphipphurra:local .
node scripts/docker-smoke.mjs
```

Tests use fictional people, isolated databases, and simulated Teams destinations.
The Docker test checks HTTP, the calendar, license files, non-root execution, and
data persistence after a restart. It removes its test containers and volumes afterward.

`check:repo` checks current Git publication candidates, including staged contents,
for private files and known credential patterns. It also checks font licenses and
documented checksums. It does not scan previous Git history.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | Reachable address without a subpath; used in calendar and message links |
| `HTTP_PORT` | `3000` | Published Compose port |
| `BIND_ADDRESS` | `127.0.0.1` | Compose bind address |
| `TEAMS_WEBHOOK_URL` | empty | Secret HTTPS URL of the Teams workflow |
| `TEAMS_LANGUAGE` | `de` | Language of shared Teams messages: `de` or `en` |
| `IMAGE` | empty | Required by `compose.yaml`: image address including a tag |

Docker Compose reads `.env` automatically. After changes, run `docker compose up -d`
or, for a source build, `docker compose -f compose.build.yaml up -d --build`.
When changing the port, update both `HTTP_PORT` and `BASE_URL`. Behind a reverse
proxy, use the external HTTPS address for `BASE_URL`. Subpaths are not supported.

## Localization

Repository documentation, code comments, and server logs are in English. Application
translations are kept in `public/i18n.js` and shared by the browser and server.
Keep both dictionaries and their interpolation placeholders in sync when adding text.
Use text nodes or escape translated text before inserting user data into HTML.

On the first visit, the application chooses the first supported language from
`navigator.languages`, including regional variants such as `de-CH` and `en-US`.
English is the fallback. The header selector offers English, German, and
**Browser (automatic)**. Manual choices are stored under `hipphipphurra.language`
in local storage; automatic mode removes the override. If storage is unavailable,
the selection still works for the current visit.

Switching languages updates text, accessible labels, month names, dates, dialogs,
and error messages without resetting form entries, search, or filters. Browser
preference changes are applied while automatic mode is active.

API errors follow `Accept-Language` and include a stable `code` and, where needed,
interpolation `params`. English is used when no supported preference is supplied.
Calendar links include `?lang=en` or `?lang=de`, keeping subscription text consistent
even when a calendar client sends different language preferences. Event IDs remain
the same in both languages.

Teams reminders are sent without a browser session and default to German. Set
`TEAMS_LANGUAGE=en` for English or `de` for German for the whole channel. This does not change
the schedule: all birthday calculations and reminders use `Europe/Berlin`.

## Calendar subscriptions

In the application, open **Subscribe → In your calendar** and subscribe using the
displayed calendar URL, such as `/calendar.ics?lang=en`.
In Outlook: **Add calendar → Subscribe from web**.
In Apple Calendar: **File → New Calendar Subscription**.

- Subscriptions pick up added, changed, and deleted entries on the next refresh.
- An ICS import is a snapshot and does not update automatically.
- Outlook adds the subscription as a separate calendar; overlay view can display it
  alongside your main calendar.
- The calendar application or service controls refreshes and reminders. The feed
  does not guarantee a notification at 08:00.
- The client fetching the feed must be able to reach the address. Microsoft or Google
  cloud services may not be able to access an intranet address.

## Teams webhook

1. Open **Workflows** in your Teams channel.
2. Choose a template such as **Send webhook alerts to a channel** with
   **When a Teams webhook request is received**. The workflow must support Adaptive Cards.
3. Select the channel and execution account. The integration requires the caller
   setting **Anyone**; the secret URL authorizes requests.
4. Set the HTTPS URL as `TEAMS_WEBHOOK_URL` in `.env`, choose `TEAMS_LANGUAGE`, and
   update the container using Compose.

Add another workflow owner to simplify ongoing maintenance. Tenant policies may
restrict this setup. Everyone in the channel sees the same message; individual
Teams subscriptions are not required.
[Microsoft documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=dotnet)

## Data and operation

| Environment | Database |
| --- | --- |
| Container | `/data/kuchenzeit.sqlite` |
| Compose host | `data/kuchenzeit.sqlite` in the project directory |
| Direct Node execution | `./data/kuchenzeit.sqlite`, configurable through `DATA_DIR` |

Run a single instance. The `kuchenzeit` service name, database name, calendar event
IDs, and `X-Kuchenzeit` API header remain stable for existing installations.
Migrations run automatically at startup.

### Reminders

- The scheduler checks every minute and sends Teams messages at 08:00 on the birthday
  in `Europe/Berlin`, including weekends. Daylight saving time is taken into account.
- No birthday means no message. After starting later than 08:00, only outstanding
  messages for the current day are sent.
- Entries added after 08:00 are included if no Teams message has been sent that day.
- Failed deliveries are retried at five-minute intervals, up to three attempts per day.
  Successful deliveries remain recorded across restarts.
- Ambiguous webhook failures or a crash between delivery and confirmation can result
  in a duplicate message.
- February 29 birthdays fall on February 28 in non-leap years, including in the feed.

### Updates and backups

Update the image:

```sh
docker compose pull
docker compose up -d
```

For source installations, run `docker compose -f compose.build.yaml up -d --build`
after updating. Back up before updating; older application versions may reject
newer database schemas.

To back up, stop the application, copy the entire `data/` directory, and restart
the application. Back up `.env` separately and keep it private. Copying only the
live SQLite main file is insufficient because WAL files may be present.
When restoring, ensure write access for UID/GID 1000.

Logs: `docker compose logs -f`. For source installations, add `-f compose.build.yaml`
before each subcommand. `GET /health` checks HTTP and database access, not the
external Teams connection. Logs do not include the webhook URL.

## GitHub and releases

Branch pushes, pull requests, and manual CI runs check repository files and run
tests on Linux and Windows. Docker images are built only when a GitHub release is
published, and uploaded to `ghcr.io/<account>/<repository>` after successful checks.
The image supports Linux/amd64.

| Trigger | Tags |
| --- | --- |
| Published stable release, e.g. `v1.0.0` | `1.0.0`, `latest`, commit tag |
| Published prerelease, e.g. `v1.1.0-rc.1` | `1.1.0-rc.1`, commit tag |
| Branch push, pull request, or manual workflow run | Checks only; no image build |
| Tag push without a release, or release draft | No publication |

To publish, use **GitHub → Releases → Draft a new release**, select or create a tag
such as `v1.0.0`, and choose **Publish release**. A tag push alone is insufficient.
CI checks the release tag's code and tests the release image before upload. Each
image also receives `sha-<full-commit-sha>`; OCI labels record the repository URL
and commit SHA.

Tags must use `vMAJOR.MINOR.PATCH`, optionally with a prerelease suffix such as
`v1.0.0-rc.1`. Build metadata using `+` is not supported. Only stable releases update
`latest`. Either the GitHub prerelease flag or a prerelease suffix prevents it.

The publish job uses the automatically provided `GITHUB_TOKEN` with `packages: write`.
No custom token is needed. Pull request checks do not log in to the registry.
Actions and the Docker base image are pinned; Dependabot checks them monthly.

New GHCR packages are initially private. After the first publication, open
**Packages → Package → Package settings → Change visibility** and select **Public**
for downloads without authentication. Private images require `docker login ghcr.io`.
[GitHub documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

After creating the GitHub repository, configure required CI checks and enable
private vulnerability reporting. GitHub Pages cannot run this Node server with
SQLite and its scheduler.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/employees` | Employees with next birthday and age calculations |
| POST | `/api/employees` | Add an employee |
| PUT / DELETE | `/api/employees/:id` | Edit / delete an employee |
| GET | `/api/config` | Calendar URL and Teams availability |
| GET / HEAD | `/calendar.ics?lang=en` | Calendar feed in English; use `de` for German |
| GET | `/health` | Health check |

Writes require `Content-Type: application/json` and `X-Kuchenzeit: 1`.
Example: `{ "name": "Alex Example", "day": 15, "month": 6, "year": null }`.
Send `Accept-Language: de` or `en` for localized error messages. For calendars,
an explicit supported `lang` query parameter takes precedence over the header.

## Contributions

- Describe the change and checks performed in the pull request.
- Test changes to date calculations, calendars, delivery, migrations, and localization.
- Use fictional people in tests, examples, and screenshots.
- Keep `.env`, databases, backups, credentials, and design exports local.
  `.gitignore` does not remove files from existing Git history.
- Record third-party sources and licenses in `THIRD_PARTY_NOTICES.md`.
  Distribute font licenses unchanged.
- Contributions to project code are licensed under MIT; third-party materials keep
  their own licenses.

Vulnerability reporting and access limits: [SECURITY.md](SECURITY.md).
