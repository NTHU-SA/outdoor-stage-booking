import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.ts',
        'src/utils/**/*.ts',
        'src/app/dashboard/book/utils.ts',
        'src/app/dashboard/book/schema.ts',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/utils/supabase/client.ts',
        'src/utils/supabase/server.ts',
        'src/utils/supabase/service.ts',
        'src/utils/supabase/middleware.ts',
        'src/utils/supabase/admin-queries.ts',
        'src/utils/supabase/admin-users-helper.ts',
        'src/proxy.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
