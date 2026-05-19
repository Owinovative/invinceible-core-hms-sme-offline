# Desktop Build Guide

This guide explains how to run and package Invinceible Core HMS SME Offline as a Windows desktop app.

## What the Desktop App Does

The desktop app is an Electron shell. It starts the local NestJS API automatically, then opens the React dashboard in a normal desktop window.

Development mode:

```text
Electron
  starts npm --workspace apps/api run dev
  starts npm --workspace apps/web run dev
  opens http://127.0.0.1:5178
```

Packaged mode:

```text
Electron
  starts packaged API using Electron as Node
  loads packaged React dist/index.html
  stores SQLite data in the Windows app data folder
```

## Requirements

- Windows 10 or newer
- Node.js 22 LTS recommended
- npm
- Internet access only during development/install/build

After installation, the app itself is designed to run offline.

## Fresh Developer Setup

From the repository root:

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run build
```

If you want a development admin account, run:

```powershell
$env:SEED_DEV_ADMIN="true"
npm run db:seed
```

Development login then becomes:

```text
Username: admin
Password: AdminPass123
```

For real clinic use, prefer first-run setup instead of the dev admin seed.

## Run Desktop Development Mode

```powershell
npm run desktop:dev
```

This compiles the Electron main process, starts the local API, starts the web dashboard, and opens the desktop window.

If ports are already busy, close any old `node.exe` processes or change:

```powershell
$env:API_PORT="4790"
$env:WEB_PORT="5179"
npm run desktop:dev
```

## Build the Windows Installer

Important: do not set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` when making the real installer. Electron must download its Windows binary.

```powershell
npm install
npm run build
npm run desktop:make
```

Build artifacts are written to:

```text
apps/desktop/out/
```

The intended Windows setup artifact is:

```text
InvinceibleCoreHmsSmeOfflineSetup.exe
```

## End-User First Run

1. Install the app.
2. Launch **Invinceible Core HMS SME Offline**.
3. Complete first-run setup:
   - facility name;
   - address and phone;
   - first super admin name, username, and password.
4. Log in and begin patient registration.

## Local Data Location

In installed mode, data is stored in the Electron app data folder:

```text
%APPDATA%\Invinceible Core HMS SME Offline
```

The SQLite file is created automatically. Backups are created through the Backup page.

## Backup and Restore

Use the Backup page to export a copy of the SQLite database. Store backup files on an external drive regularly.

Restore requires selecting a `.sqlite` backup path. Restore replaces the current local database.

## Troubleshooting

### Electron download hangs

If `npm install` hangs while downloading Electron, check internet/network filtering. For temporary code-only verification you may use:

```powershell
$env:ELECTRON_SKIP_BINARY_DOWNLOAD="1"
npm install
```

Do not use that environment variable when creating the installer.

### App says API did not start

Run:

```powershell
npm run build
npm run desktop:dev
```

Then check console output for the `[api]` logs.

### Database fails to initialize

Run:

```powershell
npm run db:migrate
npm run db:seed
```

The project uses a Prisma Client-backed SQLite initializer for reliability on Windows.

