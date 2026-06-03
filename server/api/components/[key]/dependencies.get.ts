import { decodeComponentKey } from '../../../../utils/component-identity'
import type { DependencyScope, DependencyTreeResponse } from '~~/types/api'
import { componentService } from '../../../services/singletons'

const ALLOWED_SCOPES = new Set<DependencyScope>([
  'required',
  'optional',
  'excluded',
  'dev',
  'test',
  'runtime',
  'provided'
])

const DEFAULT_MAX_DEPTH = 10
const MAX_DEPTH = 10
const DEFAULT_LIMIT = 500
const MAX_LIMIT = 500

/**
 * @openapi
 * /components/{key}/dependencies:
 *   get:
 *     tags:
 *       - Components
 *     summary: Get component dependency tree
 *     description: Retrieves direct and transitive dependencies for a component. Scope filtering requires a system context because dependency scope is stored on System USES Component relationships.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Encoded component identity from the components list.
 *       - in: query
 *         name: system
 *         schema:
 *           type: string
 *         description: Restrict dependencies to components used by this system.
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *         description: Comma-separated dependency scopes. Requires system.
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 10
 *         description: Maximum DEPENDS_ON traversal depth.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *           minimum: 1
 *           maximum: 500
 *         description: Maximum unique dependency nodes returned.
 *     responses:
 *       200:
 *         description: Dependency tree retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSingleResourceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DependencyTreeResponse'
 *       400:
 *         description: Component key or query parameters are invalid
 *       404:
 *         description: Component or system not found
 */
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Component key is required'
    })
  }

  const identity = decodeComponentKey(key)
  if (!identity) {
    throw createError({
      statusCode: 400,
      message: 'Component key is invalid'
    })
  }

  const query = getQuery(event)
  const system = typeof query.system === 'string' && query.system.trim()
    ? query.system.trim()
    : undefined
  const scopes = parseScopes(query.scope)

  if (scopes.length > 0 && !system) {
    throw createError({
      statusCode: 400,
      message: 'scope filter requires system query parameter'
    })
  }

  const maxDepth = parseBoundedInteger(query.maxDepth, 'maxDepth', DEFAULT_MAX_DEPTH, MAX_DEPTH)
  const limit = parseBoundedInteger(query.limit, 'limit', DEFAULT_LIMIT, MAX_LIMIT)

  const dependencyTree = await componentService.findDependencies(identity, {
    system,
    scopes,
    maxDepth,
    limit
  })

  if (!dependencyTree) {
    throw createError({
      statusCode: 404,
      message: 'Component not found'
    })
  }

  if (!dependencyTree.systemExists) {
    throw createError({
      statusCode: 404,
      message: `System '${system}' not found`
    })
  }

  const data: DependencyTreeResponse = {
    componentKey: key,
    dependencies: dependencyTree.dependencies,
    totalCount: dependencyTree.totalCount,
    hasCircularDependencies: dependencyTree.hasCircularDependencies,
    truncated: dependencyTree.truncated,
    maxDepth: dependencyTree.maxDepth
  }

  return {
    success: true,
    data
  }
})

function parseScopes(value: unknown): DependencyScope[] {
  if (value === undefined || value === null || value === '') return []
  if (typeof value !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'scope must be a comma-separated string'
    })
  }

  const scopes = value.split(',')
    .map(scope => scope.trim())
    .filter(Boolean)

  for (const scope of scopes) {
    if (!ALLOWED_SCOPES.has(scope as DependencyScope)) {
      throw createError({
        statusCode: 400,
        message: `Invalid scope '${scope}'`
      })
    }
  }

  return [...new Set(scopes)] as DependencyScope[]
}

function parseBoundedInteger(
  value: unknown,
  name: string,
  defaultValue: number,
  maxValue: number
): number {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value !== 'string') {
    throw createError({
      statusCode: 400,
      message: `${name} must be an integer`
    })
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || String(parsed) !== value || parsed < 1) {
    throw createError({
      statusCode: 400,
      message: `${name} must be a positive integer`
    })
  }

  return Math.min(parsed, maxValue)
}
