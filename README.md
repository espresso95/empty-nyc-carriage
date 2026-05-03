# Empty NYC Carriage

Subway platform-zone recommendation app.

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

Phase 3 adds manifest-driven downloads, static imports, station search, and generated zone profiles. Full datasets are written to gitignored `data/raw/` paths.

```bash
npm run data:download
npm run data:download:gtfs
npm run data:download:socrata
```

Import downloaded datasets and generate zone profiles:

```bash
npm run data:import
npm run data:build-zone-profiles
npm run data:validate-zone-profiles
```

Station search is available at:

```text
GET /api/stations/search?q=bedford
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```
