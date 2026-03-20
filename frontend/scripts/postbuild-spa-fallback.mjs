import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '..', 'dist')
const indexHtmlPath = path.join(distDir, 'index.html')
const fallback404Path = path.join(distDir, '404.html')
const redirectsPath = path.join(distDir, '_redirects')

const run = async () => {
  const indexHtml = await fs.readFile(indexHtmlPath, 'utf8')
  await fs.writeFile(fallback404Path, indexHtml, 'utf8')
  await fs.writeFile(redirectsPath, '/* /index.html 200\n', 'utf8')
}

run().catch((error) => {
  console.error('postbuild-spa-fallback failed:', error)
  process.exit(1)
})
