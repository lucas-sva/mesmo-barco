import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Official-data queue sims can exceed the 5s default on slow CI runners.
    testTimeout: 20_000,
  },
})
