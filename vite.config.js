import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://sudee20g-lgtm.github.io/bag-atelier/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/bag-atelier/' : '/',
  server: { port: 5180 },
}));
