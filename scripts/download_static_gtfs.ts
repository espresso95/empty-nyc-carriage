import { downloadDataset, filterDatasets, loadDatasetManifest } from "../src/lib/data/manifest";

const manifest = await loadDatasetManifest();
const datasets = filterDatasets(manifest, "zip");

for (const dataset of datasets) {
  const result = await downloadDataset(dataset);
  console.log(`Downloaded ${result.datasetName} -> ${result.path} (${result.bytes} bytes)`);
}
