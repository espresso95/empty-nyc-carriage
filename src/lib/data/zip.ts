import { readFile } from "node:fs/promises";
import AdmZip from "adm-zip";

export type GtfsZipFiles = {
  routesTxt: string;
  stopsTxt: string;
};

export async function readGtfsZipFiles(zipPath: string): Promise<GtfsZipFiles> {
  const buffer = await readFile(zipPath);
  const zip = new AdmZip(buffer);

  return {
    routesTxt: readRequiredZipEntry(zip, "routes.txt"),
    stopsTxt: readRequiredZipEntry(zip, "stops.txt"),
  };
}

function readRequiredZipEntry(zip: AdmZip, entryName: string): string {
  const entry = zip.getEntry(entryName);

  if (!entry) {
    throw new Error(`GTFS zip is missing ${entryName}`);
  }

  return entry.getData().toString("utf8");
}
