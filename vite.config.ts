import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/api-lab-faculdade/' : '/',
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
