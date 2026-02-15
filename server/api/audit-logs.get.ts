import { AuditLogService } from '../services/audit-log.service'

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get audit logs
 *     description: |
 *       Retrieves audit log entries with optional filtering.
 *       Returns the most recent entries first.
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., Policy, Technology)
 *       - in: query
 *         name: operation
 *         schema:
 *           type: string
 *         description: Filter by operation (e.g., ACTIVATE, DEACTIVATE, CREATE)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of entries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of entries to skip
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       operation:
 *                         type: string
 *                       entityType:
 *                         type: string
 *                       entityId:
 *                         type: string
 *                       reason:
 *                         type: string
 *                 count:
 *                   type: integer
 *                 filters:
 *                   type: object
 *                   properties:
 *                     entityTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     operations:
 *                       type: array
 *                       items:
 *                         type: string
 */

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  
  const filters = {
    entityType: query.entityType as string | undefined,
    operation: query.operation as string | undefined,
    userId: query.userId as string | undefined,
    limit: query.limit ? parseInt(query.limit as string, 10) : 100,
    offset: query.offset ? parseInt(query.offset as string, 10) : 0,
    sortBy: query.sortBy as string | undefined,
    sortOrder: (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
  }

  const auditLogService = new AuditLogService()
  
  try {
    const result = await auditLogService.getAuditLogs(filters)
    
    return {
      success: true,
      data: result.data,
      count: result.data.length,
      total: result.count,
      filters: result.filters
    }
  } catch (error) {
    console.error('Audit log fetch error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }
  }
})
