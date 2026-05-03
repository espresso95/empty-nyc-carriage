import { parse } from "csv-parse/sync";

export type CsvRecord = Record<string, string>;

export function parseCsvRecords(content: string): CsvRecord[] {
  return parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];
}

export function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
