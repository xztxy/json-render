import { defineConfig } from "vitest/config";
import path from "path";

const pkg = (dir: string, entry = "index") =>
  path.resolve(__dirname, `packages/${dir}/src/${entry}`);

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      vue: path.resolve(__dirname, "packages/vue/node_modules/vue"),

      "@json-render/core/store-utils": pkg("core", "store-utils.ts"),
      "@json-render/core": pkg("core", "index.ts"),
      "@json-render/react": pkg("react", "index.ts"),
      "@json-render/vue": pkg("vue", "index.ts"),
      "@json-render/shadcn": pkg("shadcn", "index.ts"),
      "@json-render/react-pdf": pkg("react-pdf", "index.ts"),
      "@json-render/react-native": pkg("react-native", "index.ts"),
      "@json-render/remotion": pkg("remotion", "index.ts"),
      "@json-render/codegen": pkg("codegen", "index.ts"),
      "@json-render/zustand": pkg("zustand", "index.ts"),
      "@json-render/redux": pkg("redux", "index.ts"),
      "@json-render/jotai": pkg("jotai", "index.ts"),
      "@json-render/xstate": pkg("xstate", "index.ts"),
      "@internal/react-state": pkg("react-state", "index.tsx"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
    },
  },
});
