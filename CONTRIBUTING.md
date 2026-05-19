# Contributing

Contributions are welcome when they keep the SME Offline edition simple, safe, and maintainable.

## Development Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run desktop:dev
```

## Pull Request Expectations

- Keep the app offline-first.
- Do not add cloud requirements to core workflows.
- Preserve SQLite compatibility.
- Add tests for backend logic when changing patient, billing, lab, pharmacy, or consultation workflows.
- Do not commit `.env`, database files, backups, or generated installers.

## Product Direction

This edition is for one facility on one desktop computer. Avoid multi-tenant, branch, cloud hosting, and enterprise billing complexity.

