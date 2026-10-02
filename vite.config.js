import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  // cssMinify: esbuild — lightningcss выбрасывал backdrop-filter без префикса (стекло пропадало в Chrome)
  build: { target: 'es2020', chunkSizeWarningLimit: 1400, cssMinify: 'esbuild' },
  server: { host: true },
  // three.js is pinned to r180: the Earth shaders rely on its ShaderMaterial behaviour
});
