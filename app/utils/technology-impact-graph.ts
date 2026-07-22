import type { TimeValue } from '~~/types/api'

export const IMPACT_GRAPH_SYSTEM_LIMIT = 75

export const UNOWNED_TEAM_ID = 'team:__unowned__'
export const UNOWNED_TEAM_LABEL = 'No owning team'

export interface TechnologyImpactSystemRow {
  systemName: string
  ownerTeamName: string | null
  environment: string | null
  approved: boolean
  time: TimeValue | null
  versions: string[]
}

export interface ImpactGraphNode {
  id: string
  label: string
  type: 'technology' | 'team' | 'system'
  time?: TimeValue | null
  complianceGap?: boolean
  /** Team nodes only */
  systemCount?: number
  /** System nodes only */
  ownerTeamName?: string | null
  environment?: string | null
  versions?: string[]
}

export interface ImpactGraphEdge {
  source: string
  target: string
  complianceGap?: boolean
}

export interface BuildImpactGraphResult {
  nodes: ImpactGraphNode[]
  edges: ImpactGraphEdge[]
}

const TIME_SEVERITY_ORDER: TimeValue[] = ['eliminate', 'migrate', 'tolerate', 'invest']

function mostSevereTime(times: TimeValue[]): TimeValue | undefined {
  return TIME_SEVERITY_ORDER.find(t => times.includes(t))
}

/**
 * Shape a technology's per-system impact rows into a three-tier
 * technology -> team -> system graph. Kept free of Vue/D3/DOM so the
 * compliance-gap and TIME-tie-break logic can be unit tested directly.
 */
export function buildImpactGraph(
  technologyName: string,
  rows: TechnologyImpactSystemRow[]
): BuildImpactGraphResult {
  const techId = `tech:${technologyName}`
  const nodes: ImpactGraphNode[] = [{ id: techId, label: technologyName, type: 'technology' }]
  const edges: ImpactGraphEdge[] = []

  const teams = new Map<string, { label: string; rows: TechnologyImpactSystemRow[] }>()
  for (const row of rows) {
    const teamId = row.ownerTeamName ? `team:${row.ownerTeamName}` : UNOWNED_TEAM_ID
    const label = row.ownerTeamName ?? UNOWNED_TEAM_LABEL
    if (!teams.has(teamId)) teams.set(teamId, { label, rows: [] })
    teams.get(teamId)!.rows.push(row)
  }

  for (const [teamId, team] of teams) {
    // A system with no owning team can't have an owner-scoped approval, so
    // "no owner" is a strict superset of "owner hasn't approved" -- always
    // a compliance gap.
    const isUnowned = teamId === UNOWNED_TEAM_ID
    const approvedTimes = team.rows
      .filter(r => r.approved && r.time)
      .map(r => r.time as TimeValue)
    const teamGap = isUnowned || team.rows.every(r => !r.approved)

    nodes.push({
      id: teamId,
      label: team.label,
      type: 'team',
      complianceGap: teamGap,
      time: teamGap ? undefined : mostSevereTime(approvedTimes),
      systemCount: team.rows.length,
    })
    edges.push({ source: techId, target: teamId, complianceGap: teamGap })

    for (const row of team.rows) {
      const systemId = `system:${row.systemName}`
      const complianceGap = isUnowned || !row.approved

      nodes.push({
        id: systemId,
        label: row.systemName,
        type: 'system',
        time: row.time,
        complianceGap,
        ownerTeamName: row.ownerTeamName,
        environment: row.environment,
        versions: row.versions,
      })
      edges.push({ source: teamId, target: systemId, complianceGap })
    }
  }

  return { nodes, edges }
}
