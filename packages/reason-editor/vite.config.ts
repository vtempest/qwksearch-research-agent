import commonjs from "@rollup/plugin-commonjs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isServe = command === "serve";
  const isLibraryBuild = mode === "production" || mode === "library";
  const isDemoBuild = mode === "development";

  return {
    root: isServe || isDemoBuild ? "demo" : ".",
    build: {
      outDir: isLibraryBuild ? "dist" : "dist-demo",
      emptyOutDir: true,
      ...(isLibraryBuild && {
        lib: {
          entry: {
            index: fileURLToPath(new URL("./src/index.tsx", import.meta.url)),
            reader: fileURLToPath(new URL("./src/reader.tsx", import.meta.url)),
          },
          name: "LexicalEditorToolbar",
          formats: ["es", "cjs"],
          fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
        },
      }),
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "lexical",
          /^@lexical\/.*/,
        ],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            "react/jsx-runtime": "jsxRuntime",
            lexical: "Lexical",
          },
          assetFileNames: "style[extname]",
        },
      },
      ...(mode === "production" && {
        minify: "terser",
        terserOptions: {
          compress: {
            toplevel: true,
          },
          keep_classnames: true,
        },
      }),
    },
    define: {
      __DEV__: mode !== "production",
      "process.env.IS_PREACT": process.env.IS_PREACT,
      "process.env.LEXICAL_VERSION": JSON.stringify(
        `${process.env.npm_package_version}+git`,
      ),
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      conditions: ["style", "import", "module", "browser", "default"],
      mainFields: ["module", "main"],
      alias: {
        "@excalidraw/excalidraw/index.css": fileURLToPath(new URL(
          "./node_modules/@excalidraw/excalidraw/dist/prod/index.css",
          import.meta.url,
        )),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022",
        treeShaking: true,
      },
    },
    plugins: [
      tailwindcss(),
      react(),
      // ...viteCopyExcalidrawAssets(),
      // viteCopyEsm(),
      commonjs({
        // This is required for React 19 (at least 19.0.0-beta-26f2496093-20240514)
        // because @rollup/plugin-commonjs does not analyze it correctly
        strictRequires: [/\/node_modules\/(react-dom|react)\/[^/]\.js$/],
      }),
    ],
  };
});
