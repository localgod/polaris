import { LicenseService } from '../../../services/license.service'

interface WhitelistUpdateRequest {
  licenseId?: string
  licenseIds?: string[]
  whitelisted: boolean
}

interface WhitelistUpdateResponse {
  success: boolean
  message: string
  updated?: number
  errors?: string[]
}

/**
 * @openapi
 * /admin/licenses/whitelist:
 *   put:
 *     tags:
 *       - Admin
 *       - Licenses
 *     summary: Update license whitelist status
 *     description: |
 *       Updates whitelist status for one or multiple licenses.
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
 *               whitelisted:
 *                 type: boolean
 *                 description: New whitelist status
 *             required:
 *               - whitelisted
 *             example:
 *               licenseId: MIT
 *               whitelisted: true
 *     responses:
 *       200:
 *         description: Whitelist status updated successfully
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
 *               message: License whitelist status updated successfully
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
export default defineEventHandler(async (event): Promise<WhitelistUpdateResponse> => {
  // Require superuser access
  const user = await requireSuperuser(event)

  try {
    const body = await readBody<WhitelistUpdateRequest>(event)
    
    // Validate request body
    if (typeof body.whitelisted !== 'boolean') {
      setResponseStatus(event, 400)
      return {
        success: false,
        message: 'whitelisted field is required and must be a boolean'
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
        await licenseService.updateWhitelistStatus(body.licenseId, body.whitelisted, user.id)
        setResponseStatus(event, 200)
        return {
          success: true,
          message: `License '${body.licenseId}' whitelist status updated to ${body.whitelisted}`,
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
      const result = await licenseService.bulkUpdateWhitelistStatus(body.licenseIds, body.whitelisted, user.id)
      
      if (result.success) {
        setResponseStatus(event, 200)
        return {
          success: true,
          message: `${result.updated} licenses whitelist status updated to ${body.whitelisted}`,
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to update license whitelist status'
    setResponseStatus(event, 500)
    return {
      success: false,
      message: errorMessage
    }
  }
})