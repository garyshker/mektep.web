import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests run in plain node — everything under test is pure logic (generators,
// graders, lesson content). No DOM, no Supabase.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
