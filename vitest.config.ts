import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "coverage/**",
        "examples/**",
        "packages/**/dist/**",
        "packages/**/src/**/__tests__/**",
        "packages/**/src/**/*.test.{ts,tsx}",
        "packages/**/src/**/setup.{ts,tsx}",
        "packages/**/src/**/*.d.ts",
      ],
    },
  },
});
