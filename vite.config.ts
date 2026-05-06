import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// `vite` (default mode) → demo dev server / build of the example app.
// `vite build --mode lib` → produces the publishable component bundle.
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    plugins: [
      react(),
      ...(isLib
        ? [
            dts({
              entryRoot: 'src/TerrainMap',
              include: ['src/TerrainMap'],
              outDir: 'dist',
              rollupTypes: true,
              tsconfigPath: 'tsconfig.json',
            }),
          ]
        : []),
    ],
    server: { host: true, port: 5173 },
    ...(isLib && {
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        cssCodeSplit: false,
        lib: {
          entry: resolve(__dirname, 'src/TerrainMap/index.ts'),
          name: 'TerrainMap',
          formats: ['es', 'cjs'] as const,
          fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
          // Anything matched here is treated as a peer / external import.
          external: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'three',
            /^three\/.*/,
          ],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              three: 'THREE',
            },
            assetFileNames: (assetInfo) => {
              // Vite emits the bundled CSS as e.g. "style.css" — rename so
              // consumers can import "<pkg>/styles.css".
              if (
                assetInfo.name === 'style.css' ||
                assetInfo.name === 'react-terrain-map.css'
              ) {
                return 'index.css';
              }
              return assetInfo.name ?? 'asset';
            },
          },
        },
      },
    }),
  };
});
