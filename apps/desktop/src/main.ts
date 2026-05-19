import { app, BrowserWindow, dialog, shell } from "electron";
import started from "electron-squirrel-startup";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

if (started) app.quit();

const apiPort = Number(process.env.API_PORT || 4789);
const webPort = Number(process.env.WEB_PORT || 5178);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const devWebUrl = `http://127.0.0.1:${webPort}`;

let apiProcess: ChildProcessWithoutNullStreams | undefined;
let webProcess: ChildProcessWithoutNullStreams | undefined;

function repoRoot() {
  return path.resolve(__dirname, "../../..");
}

function command(name: "npm" | "node") {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function spawnManaged(label: string, cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : "development",
      API_PORT: String(apiPort),
      VITE_API_BASE: apiUrl,
      INV_HMS_DATA_DIR: process.env.INV_HMS_DATA_DIR || app.getPath("userData"),
      INV_HMS_RESOURCE_DIR: app.isPackaged ? process.resourcesPath : repoRoot(),
      ...env
    },
    shell: false
  });

  child.stdout.on("data", (chunk) => console.log(`[${label}] ${chunk.toString().trim()}`));
  child.stderr.on("data", (chunk) => console.error(`[${label}] ${chunk.toString().trim()}`));
  child.on("exit", (code) => {
    if (code !== 0 && !(app as unknown as { isQuitting?: boolean }).isQuitting) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

async function waitFor(url: string, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startServices() {
  const root = repoRoot();
  if (app.isPackaged) {
    const apiMain = path.join(process.resourcesPath, "api", "dist", "main.js");
    const webIndex = path.join(process.resourcesPath, "web", "dist", "index.html");
    if (!existsSync(apiMain) || !existsSync(webIndex)) {
      throw new Error("Packaged app is missing API or web build artifacts. Run npm run build before packaging.");
    }
    apiProcess = spawnManaged("api", process.execPath, [apiMain], process.resourcesPath, {
      ELECTRON_RUN_AS_NODE: "1"
    });
  } else {
    apiProcess = spawnManaged("api", command("npm"), ["--workspace", "apps/api", "run", "dev"], root);
    webProcess = spawnManaged("web", command("npm"), ["--workspace", "apps/web", "run", "dev"], root);
  }
  await waitFor(`${apiUrl}/api/setup/status`);
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1080,
    minHeight: 720,
    title: "Invinceible Core HMS SME Offline",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    await win.loadFile(path.join(process.resourcesPath, "web", "dist", "index.html"));
  } else {
    await waitFor(devWebUrl);
    await win.loadURL(devWebUrl);
  }
}

app.on("before-quit", () => {
  (app as unknown as { isQuitting: boolean }).isQuitting = true;
  apiProcess?.kill();
  webProcess?.kill();
});

app.whenReady().then(async () => {
  try {
    await startServices();
    await createWindow();
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Invinceible Core HMS could not start",
      message: error instanceof Error ? error.message : "Unknown startup error."
    });
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
