import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Cela rend la variable d'environnement disponible dans le code côté client pendant le développement et la compilation.
    // Vite remplacera `process.env.API_KEY` par la valeur de la variable d'environnement API_KEY.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})