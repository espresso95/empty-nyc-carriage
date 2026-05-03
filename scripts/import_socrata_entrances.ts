import "dotenv/config";
import { readFile } from "node:fs/promises";
import { deriveStationsFromEntrances, parseEntrancesCsv } from "../src/lib/data/entrances";
import { getImportRepository } from "../src/lib/data/import-repository";
import { loadDatasetManifest, resolveDatasetOutputPath } from "../src/lib/data/manifest";

async function main() {
  const repository = getImportRepository();

  if (!repository) {
    throw new Error("DATABASE_URL is required to import entrances/exits.");
  }

  const manifest = await loadDatasetManifest();
  const dataset = manifest.datasets.find((candidate) => candidate.name === "subway_entrances_exits");

  if (!dataset || dataset.type !== "socrata") {
    throw new Error("dataset_manifest.json is missing subway_entrances_exits Socrata dataset.");
  }

  const csv = await readFile(resolveDatasetOutputPath(dataset), "utf8");
  const entrances = parseEntrancesCsv(csv);
  const stationImports = deriveStationsFromEntrances(entrances);

  await repository.upsertEntrances(entrances);
  await repository.upsertStations(stationImports);

  console.log(`Imported ${entrances.length} entrances/exits and ${stationImports.length} stations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
