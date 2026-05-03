import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setupLocalWorkspace } from "./local";

describe("setupLocalWorkspace", () => {
  it("creates a local env file and data directories", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "empty-carriage-setup-"));

    try {
      await writeFile(path.join(tempDir, ".env.example"), "DATABASE_URL=postgres://example\n");

      const result = await setupLocalWorkspace(tempDir);

      await expect(readFile(path.join(tempDir, ".env"), "utf8")).resolves.toBe(
        "DATABASE_URL=postgres://example\n",
      );
      expect(result).toEqual({
        envCreated: true,
        directoriesCreated: ["data/raw", "data/processed", "data/samples"],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not overwrite an existing env file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "empty-carriage-setup-"));

    try {
      await writeFile(path.join(tempDir, ".env.example"), "DATABASE_URL=postgres://example\n");
      await writeFile(path.join(tempDir, ".env"), "DATABASE_URL=postgres://custom\n");

      const result = await setupLocalWorkspace(tempDir);

      await expect(readFile(path.join(tempDir, ".env"), "utf8")).resolves.toBe(
        "DATABASE_URL=postgres://custom\n",
      );
      expect(result.envCreated).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
