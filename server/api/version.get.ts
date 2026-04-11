/**
 * @openapi
 * /version:
 *   get:
 *     tags:
 *       - Health
 *     summary: Application version
 *     description: Returns the version of the running application, baked in at build time.
 *     responses:
 *       200:
 *         description: Current application version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: string
 *                   example: '1.2.3'
 */
export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return { version: config.public.appVersion }
})
