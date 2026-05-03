import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RefreshCadence = "daily" | "weekly" | "daily_or_weekly" | "monthly" | "manual";

export type ZipDataset = {
  name: string;
  type: "zip";
  url: string;
  refresh: RefreshCadence;
  store: string;
  filename: string;
};

export type SocrataDataset = {
  name: string;
  type: "socrata";
  domain: string;
  dataset_id: string;
  refresh: RefreshCadence;
  store: string;
  filename: string;
  format?: "csv" | "json";
  limit?: number;
};

export type DatasetConfig = ZipDataset | SocrataDataset;

export type DatasetManifest = {
  datasets: DatasetConfig[];
};

export type DownloadResult = {
  datasetName: string;
  url: string;
  path: string;
  bytes: number;
};

type FetchLike = (url: string) => Promise<Pick<Response, "arrayBuffer" | "ok" | "status" | "statusText">>;

export async function loadDatasetManifest(
  manifestPath = "dataset_manifest.json",
): Promise<DatasetManifest> {
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText) as DatasetManifest;

  validateManifest(manifest);

  return manifest;
}

export function validateManifest(manifest: DatasetManifest): void {
  const names = new Set<string>();

  for (const dataset of manifest.datasets) {
    if (names.has(dataset.name)) {
      throw new Error(`Duplicate dataset name: ${dataset.name}`);
    }

    names.add(dataset.name);

    if (!dataset.store || !dataset.filename) {
      throw new Error(`Dataset ${dataset.name} must define store and filename`);
    }

    if (dataset.type === "zip" && !dataset.url) {
      throw new Error(`Zip dataset ${dataset.name} must define url`);
    }

    if (dataset.type === "socrata" && (!dataset.domain || !dataset.dataset_id)) {
      throw new Error(`Socrata dataset ${dataset.name} must define domain and dataset_id`);
    }
  }
}

export function filterDatasets(
  manifest: DatasetManifest,
  type?: DatasetConfig["type"],
): DatasetConfig[] {
  return type ? manifest.datasets.filter((dataset) => dataset.type === type) : manifest.datasets;
}

export function buildDatasetDownloadUrl(dataset: DatasetConfig): string {
  if (dataset.type === "zip") {
    return dataset.url;
  }

  return buildSocrataExportUrl(dataset);
}

export function buildSocrataExportUrl(dataset: SocrataDataset): string {
  const format = dataset.format ?? "csv";
  const url = new URL(`https://${dataset.domain}/resource/${dataset.dataset_id}.${format}`);

  if (dataset.limit) {
    url.searchParams.set("$limit", String(dataset.limit));
  }

  return url.toString();
}

export function resolveDatasetOutputPath(dataset: DatasetConfig, cwd = process.cwd()): string {
  return path.resolve(cwd, dataset.store, dataset.filename);
}

export async function downloadDataset(
  dataset: DatasetConfig,
  options: {
    cwd?: string;
    fetcher?: FetchLike;
  } = {},
): Promise<DownloadResult> {
  const fetcher = options.fetcher ?? fetch;
  const url = buildDatasetDownloadUrl(dataset);
  const outputPath = resolveDatasetOutputPath(dataset, options.cwd);
  const response = await fetcher(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${dataset.name}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    datasetName: dataset.name,
    url,
    path: outputPath,
    bytes: buffer.byteLength,
  };
}
