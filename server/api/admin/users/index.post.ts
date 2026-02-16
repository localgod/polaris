import { UserRepository } from '../../../repositories/user.repository'
import { AuditLogRepository } from '../../../repositories/audit-log.repository'
import { randomBytes } from 'crypto'

/**
 * @openapi
 * /admin/users:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a technical user
 *     description: Creates a non-OAuth technical user for API access. Superuser only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technical user created
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 */
export default defineEventHandler(async (event) => {
  await requireSuperuser(event)

  const body = await readBody(event)

  if (!body?.name || !body?.email) {
    throw createError({ statusCode: 400, message: 'name and email are required' })
  }

  const userRepo = new UserRepository()

  // Check if email already exists
  const existing = await userRepo.findAllSummary()
  if (existing.some(u => u.email === body.email)) {
    throw createError({ statusCode: 409, message: 'A user with this email already exists' })
  }

  const id = `technical_${randomBytes(12).toString('hex')}`

  await userRepo.createOrUpdateUser({
    id,
    email: body.email,
    name: body.name,
    provider: 'technical',
    avatarUrl: null,
    isSuperuser: false,
    role: 'user'
  })

  const currentUser = await getCurrentUser(event)
  const auditRepo = new AuditLogRepository()
  await auditRepo.create({
    operation: 'CREATE',
    entityType: 'User',
    entityId: id,
    entityLabel: body.name || body.email,
    changedFields: ['name', 'email', 'provider'],
    userId: currentUser.id
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    data: { id, name: body.name, email: body.email, provider: 'technical' }
  }
})
