import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDatasetDownloadUrl,
  buildSocrataExportUrl,
  downloadDataset,
  filterDatasets,
  validateManifest,
  type DatasetManifest,
  type SocrataDataset,
} from "./manifest";

describe("dataset manifest helpers", () => {
  it("builds Socrata CSV export URLs from domain and dataset id", () => {
    const dataset: SocrataDataset = {
      name: "subway_entrances_exits",
      type: "socrata",
      domain: "data.ny.gov",
      dataset_id: "i9wp-a4ja",
      refresh: "monthly",
      store: "data/raw/socrata/subway_entrances_exits/",
      filename: "subway_entrances_exits.csv",
      limit: 10,
    };

    expect(buildSocrataExportUrl(dataset)).toBe(
      "https://data.ny.gov/resource/i9wp-a4ja.csv?%24limit=10",
    );
  });

  it("uses direct URLs for zip datasets", () => {
    const manifest = makeManifest();

    expect(buildDatasetDownloadUrl(manifest.datasets[0])).toBe(
      "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip",
    );
  });

  it("filters datasets by type", () => {
    const manifest = makeManifest();

    expect(filterDatasets(manifest, "socrata").map((dataset) => dataset.name)).toEqual([
      "subway_entrances_exits",
    ]);
  });

  it("rejects duplicate dataset names", () => {
    const manifest = makeManifest();
    manifest.datasets.push({ ...manifest.datasets[0] });

    expect(() => validateManifest(manifest)).toThrow("Duplicate dataset name");
  });

  it("downloads datasets to their gitignored raw path", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "empty-carriage-data-"));

    try {
      const [dataset] = makeManifest().datasets;
      const result = await downloadDataset(dataset, {
        cwd: tempDir,
        fetcher: async () =>
          new Response("zip-bytes", {
            status: 200,
            statusText: "OK",
          }),
      });

      await expect(readFile(result.path, "utf8")).resolves.toBe("zip-bytes");
      expect(result.path).toBe(path.join(tempDir, "data/raw/gtfs_static/gtfs_subway.zip"));
      expect(result.bytes).toBe(9);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("downloads Socrata CSV datasets in pages so full exports are not truncated", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "empty-carriage-data-"));
    const requestedUrls: string[] = [];

    try {
      const dataset: SocrataDataset = {
        name: "subway_entrances_exits",
        type: "socrata",
        domain: "data.ny.gov",
        dataset_id: "i9wp-a4ja",
        refresh: "monthly",
        store: "data/raw/socrata/subway_entrances_exits/",
        filename: "subway_entrances_exits.csv",
        limit: 2,
      };
      const result = await downloadDataset(dataset, {
        cwd: tempDir,
        fetcher: async (url) => {
          requestedUrls.push(url);

          return new Response(
            [
              "station_id,stop_name",
              "135,Bedford Av",
              "136,1 Av",
            ].join("\n"),
            {
              status: 200,
              statusText: "OK",
            },
          );
        },
      });

      await expect(readFile(result.path, "utf8")).resolves.toBe(
        ["station_id,stop_name", "135,Bedford Av", "136,1 Av"].join("\n"),
      );
      expect(requestedUrls).toEqual(["https://data.ny.gov/resource/i9wp-a4ja.csv?%24limit=2"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("removes repeated Socrata headers when appending later pages", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "empty-carriage-data-"));
    const requestedUrls: string[] = [];

    try {
      const dataset: SocrataDataset = {
        name: "subway_entrances_exits",
        type: "socrata",
        domain: "data.ny.gov",
        dataset_id: "i9wp-a4ja",
        refresh: "monthly",
        store: "data/raw/socrata/subway_entrances_exits/",
        filename: "subway_entrances_exits.csv",
        page_size: 2,
      };
      const result = await downloadDataset(dataset, {
        cwd: tempDir,
        fetcher: async (url) => {
          requestedUrls.push(url);

          if (url.includes("%24offset=2")) {
            return new Response(["station_id,stop_name", "137,3 Av"].join("\n"), {
              status: 200,
              statusText: "OK",
            });
          }

          return new Response(
            [
              "station_id,stop_name",
              "135,Bedford Av",
              "136,1 Av",
            ].join("\n"),
            {
              status: 200,
              statusText: "OK",
            },
          );
        },
      });

      await expect(readFile(result.path, "utf8")).resolves.toBe(
        ["station_id,stop_name", "135,Bedford Av", "136,1 Av", "137,3 Av"].join("\n"),
      );
      expect(requestedUrls).toEqual([
        "https://data.ny.gov/resource/i9wp-a4ja.csv?%24limit=2",
        "https://data.ny.gov/resource/i9wp-a4ja.csv?%24limit=2&%24offset=2",
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function makeManifest(): DatasetManifest {
  return {
    datasets: [
      {
        name: "mta_gtfs_static_subway",
        type: "zip",
        url: "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip",
        refresh: "weekly",
        store: "data/raw/gtfs_static/",
        filename: "gtfs_subway.zip",
      },
      {
        name: "subway_entrances_exits",
        type: "socrata",
        domain: "data.ny.gov",
        dataset_id: "i9wp-a4ja",
        refresh: "monthly",
        store: "data/raw/socrata/subway_entrances_exits/",
        filename: "subway_entrances_exits.csv",
      },
    ],
  };
}
