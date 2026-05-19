import { homedir } from "node:os";
import { resolve } from "node:path";

export function resolveDataDir(): string {
  return resolve(process.env.INV_HMS_DATA_DIR || resolve(homedir(), "AppData", "Roaming", "InvinceibleCoreHmsSmeOffline"));
}

export function resolveDatabasePath(dataDir = resolveDataDir()): string {
  return resolve(dataDir, "hms.sqlite");
}

export function resolveDatabaseUrl(dataDir = resolveDataDir()): string {
  return `file:${resolveDatabasePath(dataDir).replace(/\\/g, "/")}`;
}

export function resolveBackupDir(): string {
  return resolve(process.env.INV_HMS_BACKUP_DIR || resolve(resolveDataDir(), "backups"));
}
