import { downloadDataset, loadDatasetManifest } from "../src/lib/data/manifest";

const manifest = await loadDatasetManifest();

for (const dataset of manifest.datasets) {
  const result = await downloadDataset(dataset);
  console.log(`Downloaded ${result.datasetName} -> ${result.path} (${result.bytes} bytes)`);
}

console.log("Import step is intentionally deferred until Phase 3 table importers are added.");
