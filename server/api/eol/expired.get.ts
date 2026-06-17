import { eolRollupService } from '../../services/singletons'

/**
 * @openapi
 * /eol/expired:
 *   get:
 *     tags:
 *       - EOL
 *     summary: Get portfolio items past end-of-life
 *     description: Returns components and linked technologies already unsupported or past EOL.
 *     responses:
 *       200:
 *         description: EOL rollup retrieved successfully
 */
export default defineEventHandler(async () => {
  const data = await eolRollupService.getExpired()
  return {
    success: true,
    data,
    count: data.items.length
  }
})
