import { setupLocalWorkspace } from "../src/lib/setup/local";

async function main() {
  const result = await setupLocalWorkspace();

  console.log(result.envCreated ? "Created .env from .env.example." : ".env already exists; left it unchanged.");
  console.log(`Ensured local data directories: ${result.directoriesCreated.join(", ")}.`);
  console.log("Next for a fresh machine: npm run bootstrap, then npm run data:bootstrap when you want full imported data.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
