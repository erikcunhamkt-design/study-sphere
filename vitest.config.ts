import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

// Config de testes separada da de build (vite.config.ts usa
// @lovable.dev/vite-tanstack-config, que traz o plugin TanStack Start/Nitro
// — desnecessário e mais lento para testes unitários/de componente).
export default defineConfig({
  plugins: [react(), tsConfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
