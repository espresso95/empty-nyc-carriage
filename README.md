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

## Data Downloads

Phase 3 starts with manifest-driven downloads. Full datasets are written to gitignored `data/raw/` paths.

```bash
npm run data:download
npm run data:download:gtfs
npm run data:download:socrata
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```
