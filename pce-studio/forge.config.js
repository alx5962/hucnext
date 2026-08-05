/* eslint-disable @typescript-eslint/no-var-requires */
const rendererConfig = require("./src/apps/gb-studio/webpack.renderer.config.js");

const rendererPreloadConfig = {
  ...rendererConfig,
  plugins: [],
};

module.exports = {
  packagerConfig: {
    name: "PCE Studio",
    executableName: "pce-studio",
    asar: true,
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "darwin", "linux"],
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        devContentSecurityPolicy:
          "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; worker-src 'self' blob:;",
        devServer: { liveReload: false },
        mainConfig: "./src/apps/gb-studio/webpack.main.config.js",
        renderer: {
          config: "./src/apps/gb-studio/webpack.renderer.config.js",
          nodeIntegration: false,
          entryPoints: [
            {
              html: "./src/apps/gb-studio/project/project.html",
              js: "./src/apps/gb-studio/project/ProjectRoot.tsx",
              preload: {
                js: "./src/apps/gb-studio/project/preload.ts",
                config: rendererPreloadConfig,
              },
              name: "main_window",
            },
            {
              html: "./src/apps/gb-studio/splash/splash.html",
              js: "./src/apps/gb-studio/splash/SplashRoot.tsx",
              preload: {
                js: "./src/apps/gb-studio/splash/preload.ts",
                config: rendererPreloadConfig,
              },
              name: "splash_window",
            },
            {
              html: "./src/apps/gb-studio/preferences/preferences.html",
              js: "./src/apps/gb-studio/preferences/PreferencesRoot.tsx",
              preload: {
                js: "./src/apps/gb-studio/project/preload.ts",
                config: rendererPreloadConfig,
              },
              name: "preferences_window",
            },
          ],
        },
      },
    },
  ],
};
