# Empty NYC Carriage

Subway platform-zone recommendation app.

## Development

```bash
nvm use
npm ci
npm run bootstrap
npm run dev
```

The app can run in fixture mode without Postgres. Persistence, dashboards, station search, and imports need the local database.

## Mac Mini / Fresh Machine Setup

From a clean clone or after `git pull` on another machine:

```bash
nvm install
nvm use
npm ci
npm run bootstrap
npm run dev
```

To fully rebuild local transit data on that machine:

```bash
npm run data:bootstrap
```

`data/raw/`, `data/processed/`, `.env`, and database files are intentionally gitignored. They are local machine state and can be recreated from committed scripts and `dataset_manifest.json`.

Daily workflow between machines:

```bash
git pull
npm ci
npm run db:migrate
npm run dev
```

## Database

Phase 2 persistence uses Postgres through Drizzle. Create `.env` from `.env.example`, then run:

```bash
npm run db:up
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

Or run all verification:

```bash
npm run verify
```
