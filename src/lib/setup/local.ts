import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type LocalSetupResult = {
  envCreated: boolean;
  directoriesCreated: string[];
};

const localDataDirectories = ["data/raw", "data/processed", "data/samples"] as const;

export async function setupLocalWorkspace(root = process.cwd()): Promise<LocalSetupResult> {
  const envCreated = await ensureEnvFile(root);
  const directoriesCreated: string[] = [];

  for (const directory of localDataDirectories) {
    await mkdir(path.join(root, directory), { recursive: true });
    directoriesCreated.push(directory);
  }

  return {
    envCreated,
    directoriesCreated,
  };
}

async function ensureEnvFile(root: string): Promise<boolean> {
  const envPath = path.join(root, ".env");

  if (await exists(envPath)) {
    return false;
  }

  await copyFile(path.join(root, ".env.example"), envPath);

  return true;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
