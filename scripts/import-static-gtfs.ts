import "dotenv/config";
import { deriveStationsFromGtfsStops, parseGtfsRoutesCsv, parseGtfsStopsCsv } from "../src/lib/data/gtfs";
import { loadDatasetManifest, resolveDatasetOutputPath } from "../src/lib/data/manifest";
import { readGtfsZipFiles } from "../src/lib/data/zip";
import { getImportRepository } from "../src/lib/data/import-repository";

async function main() {
  const repository = getImportRepository();

  if (!repository) {
    throw new Error("DATABASE_URL is required to import static GTFS.");
  }

  const manifest = await loadDatasetManifest();
  const dataset = manifest.datasets.find((candidate) => candidate.name === "mta_gtfs_static_subway");

  if (!dataset || dataset.type !== "zip") {
    throw new Error("dataset_manifest.json is missing mta_gtfs_static_subway zip dataset.");
  }

  const files = await readGtfsZipFiles(resolveDatasetOutputPath(dataset));
  const routes = parseGtfsRoutesCsv(files.routesTxt);
  const stops = parseGtfsStopsCsv(files.stopsTxt);
  const stationImports = deriveStationsFromGtfsStops(stops);

  await repository.upsertGtfsRoutes(routes);
  await repository.upsertGtfsStops(stops);
  await repository.upsertStations(stationImports);

  console.log(
    `Imported ${routes.length} GTFS routes, ${stops.length} GTFS stops, and ${stationImports.length} stations.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
