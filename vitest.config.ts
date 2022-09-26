
import { defineConfig } from 'vitest/config'
export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    include:['**/*.test.ts'],
    transformMode: {
      web: [/\.[jt]sx$/],
    },
  },
})
