import { randomUUID } from 'crypto'
import { userService } from '../../../services/singletons'

/**
 * @openapi
 * /admin/users/invite:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Invite a GitHub user
 *     description: |
 *       Creates a pending user record for a GitHub username and returns a
 *       shareable invite link. The user is activated when they first sign in
 *       via GitHub OAuth and their username matches the pending record.
 *
 *       **Authorization:** Superuser
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - githubUsername
 *             properties:
 *               githubUsername:
 *                 type: string
 *                 description: GitHub username (login) to invite
 *           example:
 *             githubUsername: octocat
 *     responses:
 *       201:
 *         description: Invite created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     inviteUrl:
 *                       type: string
 *                     githubUsername:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *       400:
 *         description: Missing or invalid GitHub username
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       409:
 *         description: A pending invite already exists for this username
 */
export default defineEventHandler(async (event) => {
  const currentUser = await requireSuperuser(event)
  const realUserId = await getImpersonatorId(event)

  const body = await readBody(event)
  const githubUsername: string = (body.githubUsername || '').trim()

  if (!githubUsername) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'githubUsername is required' })
  }

  // Check for an existing pending invite
  const existing = await userService.findPendingByUsername(githubUsername)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `A pending invite already exists for @${githubUsername}`
    })
  }

  // Fetch public profile from GitHub so we can show name/avatar immediately
  let name: string | null = null
  let avatarUrl: string | null = null
  let email = ''
  try {
    const ghRes = await $fetch<{ name?: string | null; avatar_url?: string; email?: string | null }>(
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}`,
      { headers: { 'User-Agent': 'Polaris', Accept: 'application/vnd.github.v3+json' } }
    )
    name = ghRes.name ?? null
    avatarUrl = ghRes.avatar_url ?? null
    email = ghRes.email ?? ''
  } catch {
    // GitHub profile fetch is best-effort; proceed without it
  }

  const rawExpiry = body.expiryDays
  const expiryDays: number | null =
    rawExpiry == null ? 7 : Number.isFinite(Number(rawExpiry)) && Number(rawExpiry) > 0
      ? Number(rawExpiry)
      : null

  const inviteToken = randomUUID()
  const pendingId = `invite-${randomUUID()}`

  await userService.createPendingUser({
    id: pendingId,
    email,
    name,
    avatarUrl,
    githubUsername,
    inviteToken,
    expiryDays,
    createdBy: currentUser.id,
    realUserId
  })

  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || `https://${getRequestHost(event)}`
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  setResponseStatus(event, 201)
  return {
    success: true,
    data: { inviteUrl, githubUsername, expiresAt }
  }
})
