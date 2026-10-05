import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Unique per build. Baked into the bundle and written to /version.json so an
// open tab can tell when a newer version has been deployed.
const APP_VERSION = String(Date.now());

function versionFile(): Plugin {
  return {
    name: "version-file",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: APP_VERSION }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
