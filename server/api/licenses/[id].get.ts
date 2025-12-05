import type { ApiResponse } from '~~/types/api'
import { LicenseRepository } from '../../repositories/license.repository'
import type { License } from '../../repositories/license.repository'

/**
 * @openapi
 * /licenses/{id}:
 *   get:
 *     tags:
 *       - Licenses
 *       - License Compliance
 *     summary: Get license details
 *     description: Retrieves detailed information about a specific license including usage statistics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID (SPDX identifier)
 *     responses:
 *       200:
 *         description: Successfully retrieved license
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           spdxId:
 *                             type: string
 *                           osiApproved:
 *                             type: boolean
 *                           url:
 *                             type: string
 *                           category:
 *                             type: string
 *                           text:
 *                             type: string
 *                           deprecated:
 *                             type: boolean
 *                           componentCount:
 *                             type: integer
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch license
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export default defineEventHandler(async (event): Promise<ApiResponse<License>> => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        error: 'License ID is required',
        data: []
      }
    }
    
    const licenseRepo = new LicenseRepository()
    const license = await licenseRepo.findById(id)
    
    if (!license) {
      return {
        success: false,
        error: `License '${id}' not found`,
        data: []
      }
    }
    
    return {
      success: true,
      data: [license],
      count: 1
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch license'
    return {
      success: false,
      error: errorMessage,
      data: []
    }
  }
})
