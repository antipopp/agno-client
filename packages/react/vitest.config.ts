import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@antipopp/agno-client": resolve(
        import.meta.dirname,
        "../core/src/index.ts"
      ),
      "@antipopp/agno-types": resolve(
        import.meta.dirname,
        "../types/src/index.ts"
      ),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
