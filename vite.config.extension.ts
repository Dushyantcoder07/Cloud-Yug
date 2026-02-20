import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isExtension = process.env.BUILD_TARGET === 'extension';
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Simple plugin to copy extension files after build
      {
        name: 'copy-extension-files',
        writeBundle() {
          if (!isExtension) return;
          
          const distDir = './dist-extension';
          const publicDir = './public';
          
          // Ensure dist directory exists
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
          }
          
          // Copy extension files
          const filesToCopy = [
            'manifest.json', 
            'background.js', 
            'content.js',
            'icon16.png', 
            'icon48.png', 
            'icon128.png',
            'icon16.svg',
            'icon48.svg', 
            'icon128.svg'
          ];
          
          filesToCopy.forEach(file => {
            const src = path.join(publicDir, file);
            const dest = path.join(distDir, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
              console.log(`✓ Copied ${file}`);
            }
          });
          
          console.log(`✅ Extension build complete! Files are in ${distDir}`);
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: isExtension ? {
      outDir: 'dist-extension',
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'index.html'),
          options: path.resolve(__dirname, 'options.html')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    } : undefined,
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
