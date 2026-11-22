import { defineConfig } from 'vite'
export default defineConfig({
  base: './',
  publicDir: false,
  esbuild: { jsx: 'automatic' },
  plugins: [{
    name: 'local-typescript-entry',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace('./assets/app.js', '/src/main.tsx')
        .replace('<link rel="stylesheet" href="./assets/app.css">', ''),
    },
  }],
  build: {
    rollupOptions: {
      input: 'src/main.tsx',
      output: { entryFileNames: 'assets/app.js', assetFileNames: 'assets/[name][extname]' },
    },
  },
})
