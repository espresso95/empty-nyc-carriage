import { downloadDataset, loadDatasetManifest } from "../src/lib/data/manifest";

async function main() {
  const manifest = await loadDatasetManifest();

  for (const dataset of manifest.datasets) {
    const result = await downloadDataset(dataset);
    console.log(`Downloaded ${result.datasetName} -> ${result.path} (${result.bytes} bytes)`);
  }

  console.log("Downloads complete. Run npm run data:import, then npm run data:build-zone-profiles.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
