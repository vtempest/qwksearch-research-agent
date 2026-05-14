import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'index'
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Externalize deps that shouldn't be bundled into your library
      external: [
        'xgboost_node',
        '@xenova/transformers',
        '@huggingface/transformers',
        // Add other ML libraries that might be causing issues
        /^node:/,  // Exclude Node.js built-in modules
      ],
      output: {
        // Provide global variables for externalized deps in UMD builds
        globals: {
          'xgboost_node': 'XGBoost'
        }
      }
    }
  },
  plugins: [
    dts({
      outDir: 'dist',
      rollupTypes: false,  // Disable type rolling to avoid symbol resolution issues
      include: ['src'],
      exclude: ['**/*.test.*', '**/*.spec.*'],
      staticImport: true,
      clearPureImport: true,
      insertTypesEntry: true
    })
  ]
});