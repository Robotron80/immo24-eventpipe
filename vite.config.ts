import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isTest = mode === 'test' || process.env.VITEST === 'true'

  return {
    server: {
      port: 5173,
      strictPort: true,
    },
    plugins: [
      vue(),
      ...(!isTest
        ? [
            electron([
              {
                entry: 'src/main/index.ts',
              },
              {
                entry: 'src/main/preload.ts',
                onstart(options) {
                  options.reload()
                },
              },
            ]),
          ]
        : []),
    ],
  }
})
