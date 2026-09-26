import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
const r = (p) => fileURLToPath(new URL(p, import.meta.url))
export default defineConfig({
  resolve: { alias: { src: r('./src'), stores: r('./src/stores'), components: r('./src/components') } },
  test: { include: ['test/**/*.test.js'], environment: 'node' },
})
