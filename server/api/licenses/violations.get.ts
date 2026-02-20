import { LicenseRepository } from '../../repositories/license.repository'
import type { LicenseViolation } from '../../repositories/license.repository'

/**
 * @openapi
 * /licenses/violations:
 *   get:
 *     tags:
 *       - Licenses
 *     summary: Get license violations
 *     description: Returns components using disallowed licenses.
 *     responses:
 *       200:
 *         description: License violations
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const repo = new LicenseRepository()
  const violations: LicenseViolation[] = await repo.findViolations()

  return {
    success: true,
    count: violations.length,
    data: violations
  }
})
