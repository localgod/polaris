import { readFileSync } from 'fs'
import { resolve } from 'path'

// The spec is pre-generated at build time by `npm run docs:api` and committed to
// public/openapi.json. swagger-jsdoc scans source .ts files which don't exist in
// the production image, so we serve the static file instead.
export default defineEventHandler(() => {
  const specPath = resolve(process.cwd(), 'public/openapi.json')
  const raw = readFileSync(specPath, 'utf-8')
  return JSON.parse(raw)
})
