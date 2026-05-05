import { SystemRepository } from '../../../repositories/system.repository'

interface GraphNode {
  id: string
  label: string
  type: 'system' | 'group' | 'component' | 'technology'
  packageManager?: string | null
  count?: number
  // Component detail fields (type === 'component')
  version?: string | null
  componentType?: string | null
  scope?: string | null
  purl?: string | null
  cpe?: string | null
  group?: string | null
  description?: string | null
  licenses?: Array<{ id?: string; name?: string; allowed?: boolean }>
  technologyName?: string | null
  /** True when this component is a direct dependency of the system */
  direct?: boolean
  /** IDs of component nodes this component directly depends on */
  dependsOn?: string[]
}

interface GraphEdge {
  source: string
  target: string
}

/**
 * @openapi
 * /systems/{name}/graph:
 *   get:
 *     tags:
 *       - Systems
 *     summary: Get dependency graph data for a system
 *     description: |
 *       Returns all nodes and edges for the system dependency graph.
 *       Nodes include the system, packageManager group nodes, individual
 *       component nodes, and technology nodes. Expand/collapse state is
 *       managed client-side.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Graph data returned
 *       404:
 *         description: System not found
 */
export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')

  if (!rawName) {
    throw createError({ statusCode: 400, message: 'System name is required' })
  }

  const name = decodeURIComponent(rawName)
  const repo = new SystemRepository()
  const rows = await repo.getGraph(name)

  if (rows === null) {
    throw createError({ statusCode: 404, message: `System '${name}' not found` })
  }

  const systemId = `system:${name}`
  const nodes: GraphNode[] = [{ id: systemId, label: name, type: 'system' }]
  const edges: GraphEdge[] = []

  // Single pass: count per packageManager and collect known purls simultaneously
  const groupsSeen = new Map<string, number>() // packageManager → count
  const techsSeen = new Set<string>()
  const knownPurls = new Set<string>()

  for (const row of rows) {
    if (!row.name) continue
    groupsSeen.set(row.packageManager ?? 'unknown', (groupsSeen.get(row.packageManager ?? 'unknown') ?? 0) + 1)
    if (row.purl) knownPurls.add(row.purl)
  }

  // Add group nodes and system→group edges
  for (const [pm, count] of groupsSeen) {
    const groupId = `group:${pm}`
    nodes.push({ id: groupId, label: `${pm} (${count})`, type: 'group', packageManager: pm, count })
    edges.push({ source: systemId, target: groupId })
  }

  // Add component nodes, technology nodes, and all edges
  for (const row of rows) {
    if (!row.name) continue

    const pm = row.packageManager ?? 'unknown'
    const compId = `comp:${row.purl ?? `${row.name}@${row.version ?? ''}`}`
    const groupId = `group:${pm}`

    // Resolve dependsOnPurls to node IDs; drop purls not present in this graph
    const dependsOn = row.dependsOnPurls
      .filter(p => knownPurls.has(p))
      .map(p => `comp:${p}`)

    nodes.push({
      id: compId,
      label: row.name,
      type: 'component',
      packageManager: pm,
      version: row.version,
      componentType: row.type,
      scope: row.scope,
      purl: row.purl,
      cpe: row.cpe,
      group: row.group,
      description: row.description,
      licenses: row.licenses,
      technologyName: row.technologyName,
      direct: row.direct,
      dependsOn,
    })

    edges.push({ source: groupId, target: compId })

    // comp→comp edges for dependency drill-down
    for (const depId of dependsOn) {
      edges.push({ source: compId, target: depId })
    }

    if (row.technologyName) {
      const techId = `tech:${row.technologyName}`
      if (!techsSeen.has(techId)) {
        techsSeen.add(techId)
        nodes.push({ id: techId, label: row.technologyName, type: 'technology' })
      }
      edges.push({ source: compId, target: techId })
    }
  }

  return {
    success: true,
    data: { nodes, edges }
  }
})
