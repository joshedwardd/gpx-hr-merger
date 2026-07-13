/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gpx-hr-merger/',
  test: {
    environment: 'jsdom',
  },
});
