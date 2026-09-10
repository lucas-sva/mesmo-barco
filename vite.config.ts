import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Prefer the GitHub Actions commit SHA so version.json matches the deploy.
const buildId =
  process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now().toString(36)}`

function emitVersionJson(): Plugin {
  return {
    name: 'emit-version-json',
    writeBundle(options) {
      if (!options.dir) return
      writeFileSync(
        resolve(options.dir, 'version.json'),
        `${JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 0)}\n`,
      )
    },
  }
}

// GitHub Pages: set base to '/mesmo-barco/' when deploying to project pages.
export default defineConfig({
  plugins: [react(), tailwindcss(), emitVersionJson()],
  base: './',
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
})
