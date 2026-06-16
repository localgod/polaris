import { eolRollupService } from '../../services/singletons'

/**
 * @openapi
 * /eol/approaching:
 *   get:
 *     tags:
 *       - EOL
 *     summary: Get portfolio items approaching end-of-life
 *     description: Returns components and linked technologies approaching EOL within the configured warning window.
 *     responses:
 *       200:
 *         description: EOL rollup retrieved successfully
 */
export default defineEventHandler(async () => {
  const data = await eolRollupService.getApproaching()
  return {
    success: true,
    data,
    count: data.items.length
  }
})
