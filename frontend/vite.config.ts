import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "os";
import { configDefaults } from "vitest/config";

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        const isIPv4 = alias.family === 'IPv4' || (alias.family as any) === 4;
        if (isIPv4 && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_AUTO_LOCAL_IP": JSON.stringify(localIP),
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8010",
      "/health": "http://localhost:8010",
      "/ready": "http://localhost:8010"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: [...configDefaults.exclude, "frontend/**"],
  },
});
