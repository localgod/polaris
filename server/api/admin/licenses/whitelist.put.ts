import { LicenseService } from '../../../services/license.service'

interface AllowedUpdateRequest {
  licenseId?: string
  licenseIds?: string[]
  allowed: boolean
}

interface AllowedUpdateResponse {
  success: boolean
  message: string
  updated?: number
  errors?: string[]
}

/**
 * @openapi
 * /admin/licenses/allowed:
 *   put:
 *     tags:
 *       - Admin
 *       - Licenses
 *     summary: Update license allowed status
 *     description: |
 *       Updates allowed status for one or multiple licenses.
 *       Supports both single license and bulk operations.
 *       
 *       **Authorization:** Superuser only
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licenseId:
 *                 type: string
 *                 description: Single license ID (for single update)
 *               licenseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Multiple license IDs (for bulk update)
 *               allowed:
 *                 type: boolean
 *                 description: New allowed status
 *             required:
 *               - allowed
 *             example:
 *               licenseId: MIT
 *               allowed: true
 *     responses:
 *       200:
 *         description: Allowed status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updated:
 *                   type: integer
 *                   description: Number of licenses updated
 *             example:
 *               success: true
 *               message: License allowed status updated successfully
 *               updated: 1
 *       400:
 *         description: Invalid request body or missing license data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: License not found
 */
export default defineEventHandler(async (event): Promise<AllowedUpdateResponse> => {
  // Require superuser access
  const user = await requireSuperuser(event)

  try {
    const body = await readBody<AllowedUpdateRequest>(event)
    
    // Validate request body
    if (typeof body.allowed !== 'boolean') {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'allowed field is required and must be a boolean'
      }
    }

    if (!body.licenseId && !body.licenseIds) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Either licenseId or licenseIds must be provided'
      }
    }

    if (body.licenseId && body.licenseIds) {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'Provide either licenseId or licenseIds, not both'
      }
    }

    const licenseService = new LicenseService()

    // Handle single license update
    if (body.licenseId) {
      try {
        await licenseService.updateAllowedStatus(body.licenseId, body.allowed, user.id)
        setResponseStatus(event, 200)
        return {
          success: true,
          message: `License '${body.licenseId}' allowed status updated to ${body.allowed}`,
          updated: 1
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        // Check if it's a "not found" error
        if (errorMessage.includes('not found')) {
          setResponseStatus(event, 404)
        } else {
          setResponseStatus(event, 500)
        }
        return {
          success: false,
          message: errorMessage
        }
      }
    }

    // Handle bulk license update
    if (body.licenseIds) {
      const result = await licenseService.bulkUpdateAllowedStatus(body.licenseIds, body.allowed, user.id)
      
      if (result.success) {
        setResponseStatus(event, 200)
        return {
          success: true,
          message: `${result.updated} licenses allowed status updated to ${body.allowed}`,
          updated: result.updated
        }
      } else {
        // Check if any errors mention "not found"
        const hasNotFoundError = result.errors?.some(err => err.includes('not found'))
        setResponseStatus(event, hasNotFoundError ? 404 : 400)
        return {
          success: false,
          message: 'Failed to update some licenses',
          errors: result.errors
        }
      }
    }

    setResponseStatus(event, 500)
    return {
      success: false,
      message: 'Unexpected error processing request'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update license allowed status'
    setResponseStatus(event, 500)
    return {
      success: false,
      message: errorMessage
    }
  }
})