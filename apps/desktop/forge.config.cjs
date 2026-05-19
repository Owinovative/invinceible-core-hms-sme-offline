module.exports = {
  packagerConfig: {
    name: "Invinceible Core HMS SME Offline",
    executableName: "InvinceibleCoreHmsSmeOffline",
    appBundleId: "com.owinovative.invinceiblecorehmssmeoffline",
    appCopyright: "Copyright (c) 2026 Owinovative",
    asar: false,
    extraResource: [
      { from: "../api/dist", to: "api/dist" },
      { from: "../api/prisma", to: "api/prisma" },
      { from: "../api/scripts", to: "api/scripts" },
      { from: "../web/dist", to: "web/dist" },
      { from: "../../node_modules", to: "node_modules" }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "InvinceibleCoreHmsSmeOffline",
        setupExe: "InvinceibleCoreHmsSmeOfflineSetup.exe"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"]
    }
  ]
};
