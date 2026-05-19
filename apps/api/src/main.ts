import "reflect-metadata";
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./modules/app.module";
import { resolveDataDir, resolveDatabaseUrl } from "./system/paths";

async function bootstrap() {
  const dataDir = resolveDataDir();
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(resolve(dataDir, "backups"), { recursive: true });

  process.env.DATABASE_URL = process.env.DATABASE_URL || resolveDatabaseUrl(dataDir);
  if (process.env.DATABASE_URL.startsWith("file:")) {
    mkdirSync(dirname(process.env.DATABASE_URL.replace("file:", "")), { recursive: true });
  }
  ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.API_PORT || process.env.PORT || 4789);
  await app.listen(port, "127.0.0.1");
  console.log(`Invinceible Core HMS SME API listening on http://127.0.0.1:${port}`);
}

function ensureDatabaseSchema() {
  if (process.env.INV_HMS_SKIP_AUTO_MIGRATE === "true") return;
  if (!process.env.DATABASE_URL?.startsWith("file:")) return;

  const resourceDir = process.env.INV_HMS_RESOURCE_DIR || resolve(__dirname, "../../..");
  const candidates = [
    resolve(process.cwd(), "api/scripts/init-db.cjs"),
    resolve(resourceDir, "api/scripts/init-db.cjs"),
    resolve(__dirname, "../scripts/init-db.cjs"),
    resolve(__dirname, "../../scripts/init-db.cjs"),
  ];
  const initScript = candidates.find((candidate) => existsSync(candidate));
  if (!initScript) {
    console.warn("Skipping automatic SQLite schema sync because the database initializer was not found.");
    return;
  }

  execFileSync(process.execPath, [initScript], {
    env: process.env,
    stdio: "inherit",
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
