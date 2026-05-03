import "dotenv/config";
import { getImportRepository } from "../src/lib/data/import-repository";
import { generateZoneProfilesFromEntrances } from "../src/lib/data/zone-profile-generator";

async function main() {
  const repository = getImportRepository();

  if (!repository) {
    throw new Error("DATABASE_URL is required to build zone profiles.");
  }

  const entrances = await repository.listEntrances();
  const stationIds = [...new Set(entrances.map((entrance) => entrance.gtfsStopId).filter(Boolean))] as string[];
  const profiles = stationIds.flatMap((stationId) => generateZoneProfilesFromEntrances(stationId, entrances));

  await repository.upsertGeneratedZoneProfiles(profiles);

  console.log(`Generated ${profiles.length} station-zone profile rows for ${stationIds.length} stations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
