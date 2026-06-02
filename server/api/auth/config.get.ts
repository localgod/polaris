export default defineEventHandler(() => ({
  github: {
    configured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  }
}))
