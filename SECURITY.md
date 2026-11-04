# Security

## Supported versions

Only the latest stable release is supported. Security fixes are published as new
releases; older versions do not receive separate security updates. Prereleases
are intended for testing.

## Reporting a vulnerability

Please report vulnerabilities privately through **Security → Report a vulnerability**
in the GitHub repository. Include the affected version, a description, and steps
to reproduce the issue using fictional data.

If this feature is unavailable in the repository, no private reporting channel
is currently provided. Do not post confidential details, credentials, or personal
data in public issues.

## Access model

Hipphipphurra has no authentication or roles. Anyone who can reach the application
can read, edit, and delete all employee data. The calendar feed is also accessible
without authentication. Origin and header checks do not replace authentication.

Restrict access to the intended users, for example through network rules or an
authentication proxy. See the [README](README.md#secure-operation) for deployment
guidance and handling secrets.
