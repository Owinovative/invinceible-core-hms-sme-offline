# Architecture

Invinceible Core HMS SME Offline is intentionally simple: one desktop application, one local API process, one local SQLite database, and one React dashboard.

## Runtime Shape

```text
Electron desktop shell
  starts local NestJS API on 127.0.0.1
  loads React dashboard

NestJS API
  Prisma ORM
  SQLite database in app data folder
  local file backup/export

React web app
  calls only the local API
  no cloud dependency
```

## Offline Data

The installed application stores the SQLite database in the operating system application data folder. Development runs use `INV_HMS_DATA_DIR` or `data/dev` when configured.

The system is designed for a single facility and a single computer. Later LAN support can add a shared file or lightweight local network server mode without changing the clinical workflow model.

## Startup

The API performs a safe SQLite schema sync on startup using Prisma when `INV_HMS_SKIP_AUTO_MIGRATE` is not set to `true`. The first-run setup screen creates the facility profile and first super admin account.

## Boundaries

The SME edition deliberately avoids:

- multi-tenant cloud hosting;
- branch-level complexity;
- external database servers;
- online payment dependencies;
- advanced stock batch/expiry management in the first MVP.

