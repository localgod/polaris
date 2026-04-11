// The spec is pre-generated at build time by `npm run docs:api`.
// Importing it statically lets the bundler inline it — no filesystem
// reads at runtime, so it works in the production Docker image.
import spec from '../../public/openapi.json'

export default defineEventHandler(() => spec)
