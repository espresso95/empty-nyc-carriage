# Empty NYC Carriage

Phase 0 scaffold for a subway platform-zone recommendation app.

## Development

```bash
npm install
npm run dev
```

## Database

Phase 2 persistence uses Postgres through Drizzle. Create `.env` from `.env.example`, then run:

```bash
npm run db:migrate
npm run db:seed
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```
