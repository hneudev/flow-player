import { defineConfig } from 'vite';

// DOCS_BASE sets the public path for subpath hosting, e.g. DOCS_BASE=/flow-player/ for a project page.
export default defineConfig({
  base: process.env.DOCS_BASE ?? '/',
  oxc: { jsx: { runtime: 'automatic' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
