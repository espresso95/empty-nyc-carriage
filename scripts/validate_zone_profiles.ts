import { getImportRepository } from "../src/lib/data/import-repository";
import { summarizeZoneProfiles } from "../src/lib/data/validation";

async function main() {
  const repository = getImportRepository();

  if (!repository) {
    throw new Error("DATABASE_URL is required to validate zone profiles.");
  }

  const profiles = await repository.listGeneratedZoneProfiles();
  const summary = summarizeZoneProfiles(profiles);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
