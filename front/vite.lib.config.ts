import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/lib/**/*', 'src/lib/types.d.ts'],
      exclude: ['src/App.tsx', 'src/main.tsx', 'src/**/*.test.*'],
      outDir: 'dist',
      rollupTypes: true,
      tsconfigPath: './tsconfig.app.json'
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'Hyligotchi',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          // Preserve SVG file names with a hash
          if (assetInfo.name?.endsWith('.svg')) {
            return `assets/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}) 