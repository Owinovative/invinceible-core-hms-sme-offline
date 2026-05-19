# Invinceible Core HMS SME Offline

Invinceible Core HMS SME Offline is a fully offline desktop hospital management system for small facilities, clinics, dispensaries, and single-computer installations.

It is a simpler, cheaper edition of the broader Invinceible Core HMS concept. It is not cloud-first and does not require Railway, Vercel, an external database server, or internet access after installation.

## Target Users

- small outpatient clinics;
- dispensaries;
- single-doctor practices;
- small hospital reception + doctor + lab + pharmacy workflows on one machine;
- facilities that need a low-cost local system before moving to a networked or cloud edition.

## Offline-First Architecture

- Desktop shell: Electron.
- Backend: NestJS local API started by the desktop app.
- Database: SQLite through Prisma ORM.
- Frontend: React dashboard UI.
- Data location: local application data directory.
- Backups: one-click local SQLite backup export and restore flow.

No internet is required for normal use after installation.

## MVP Modules

- authentication and local roles;
- one-facility setup wizard;
- patient registry and patient history;
- reception visit creation;
- triage;
- doctor queue sorted by priority and waiting time;
- consultation workspace;
- basic lab orders/results;
- basic pharmacy prescription dispensing;
- basic billing, invoices, payments, and receipt view;
- daily operational reports;
- local backup and restore;
- lightweight audit log.

## End-User Installation

1. Download the Windows installer from GitHub Releases.
2. Run the installer.
3. Launch **Invinceible Core HMS SME Offline**.
4. Complete the first-run setup:
   - facility name and contact details;
   - first super admin account.
5. Log in and start registering patients.

The app stores data locally on the computer. Back up regularly from the **Backup** page.

## Developer Installation

```bash
git clone https://github.com/Owinovative/invinceible-core-hms-sme-offline.git
cd invinceible-core-hms-sme-offline
npm install
npm run db:migrate
npm run db:seed
npm run desktop:dev
```

## Development Commands

```bash
npm run dev              # run API and web together
npm run db:migrate       # apply Prisma SQLite migrations
npm run db:seed          # seed roles, demo medicines, and optional dev admin
npm run test             # run backend/shared/web smoke tests
npm run build            # build shared, API, web, and desktop code
npm run desktop:dev      # run Electron development mode
npm run desktop:package  # package desktop app
npm run desktop:make     # create distributable installer artifacts
```

## Windows Installer Build

```bash
npm install
npm run db:migrate
npm run build
npm run desktop:make
```

Electron Forge writes build artifacts under `apps/desktop/out/`.

## Backups

The app can export a copy of the SQLite database to a local backup folder. Operators should copy backup files to an external drive regularly.

Default development backup path:

```text
data/dev/backups
```

Installed app backups use the desktop application data directory.

## Repository Structure

```text
apps/
  api/       NestJS local API + Prisma SQLite
  web/       React dashboard UI
  desktop/   Electron shell and installer config
packages/
  shared/    shared roles, statuses, workflow helpers
docs/        architecture and operator notes
```

## Known MVP Limitations

- Designed for one computer and one facility.
- No cloud sync.
- No production LAN synchronization yet.
- No advanced stock management beyond simple medication catalog and dispense status.
- Backups are local file copies; operators must store backup copies safely.

## License

MIT

