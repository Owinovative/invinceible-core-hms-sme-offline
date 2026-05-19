# Security Policy

Invinceible Core HMS SME Offline is intended for local clinic use and stores sensitive health data on the desktop machine.

## Supported Versions

The `main` branch is the active development line until the first tagged release.

## Reporting a Vulnerability

Do not open a public GitHub issue for patient-data exposure, authentication bypasses, backup/restore weaknesses, or local privilege escalation.

Report privately through the repository owner contact path. Include:

- affected version or commit;
- reproduction steps;
- impact;
- suggested fix if known.

## Local Deployment Responsibilities

Operators must:

- protect the Windows user account;
- keep the machine physically secure;
- create regular offline backups;
- store backups away from the main computer;
- restrict access to the app login credentials;
- avoid installing untrusted software on the HMS computer.

## Secrets

Do not commit `.env`, database files, backups, or credential files. The repository includes `.env.example` only.

