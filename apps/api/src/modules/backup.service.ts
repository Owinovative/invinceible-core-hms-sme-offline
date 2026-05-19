import { BadRequestException, Injectable } from "@nestjs/common";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { PrismaService } from "../prisma.service";
import { resolveBackupDir, resolveDatabasePath } from "../system/paths";

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  async exportBackup() {
    await this.prisma.$disconnect();
    const backupDir = resolveBackupDir();
    mkdirSync(backupDir, { recursive: true });
    const source = this.dbPath();
    const target = resolve(backupDir, `invinceible-hms-backup-${new Date().toISOString().replaceAll(":", "-")}.sqlite`);
    copyFileSync(source, target);
    await this.prisma.$connect();
    return { path: target, fileName: basename(target) };
  }

  async restoreBackup(path: string) {
    const source = resolve(path);
    if (!existsSync(source) || !source.endsWith(".sqlite")) {
      throw new BadRequestException("Select a valid .sqlite backup file.");
    }
    await this.prisma.$disconnect();
    copyFileSync(source, this.dbPath());
    await this.prisma.$connect();
    return { restored: true };
  }

  private dbPath() {
    const url = process.env.DATABASE_URL || "";
    return url.startsWith("file:") ? resolve(url.slice(5)) : resolveDatabasePath();
  }
}

