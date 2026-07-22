import { describe, it, expect } from 'vitest'
import {
  buildImpactGraph,
  UNOWNED_TEAM_ID,
  type TechnologyImpactSystemRow
} from '../../../app/utils/technology-impact-graph'

function row(overrides: Partial<TechnologyImpactSystemRow> = {}): TechnologyImpactSystemRow {
  return {
    systemName: 'sys-a',
    ownerTeamName: 'Team A',
    environment: 'prod',
    approved: true,
    time: 'invest',
    versions: ['1.0.0'],
    ...overrides
  }
}

describe('[pin] buildImpactGraph()', () => {
  it('builds a technology root node, one team node, and one system node per row', () => {
    const { nodes, edges } = buildImpactGraph('React', [row()])

    expect(nodes.find(n => n.id === 'tech:React')).toMatchObject({ type: 'technology', label: 'React' })
    expect(nodes.find(n => n.id === 'team:Team A')).toMatchObject({ type: 'team' })
    expect(nodes.find(n => n.id === 'system:sys-a')).toMatchObject({ type: 'system' })
    expect(edges).toContainEqual(expect.objectContaining({ source: 'tech:React', target: 'team:Team A' }))
    expect(edges).toContainEqual(expect.objectContaining({ source: 'team:Team A', target: 'system:sys-a' }))
  })

  it('collapses multiple systems owned by the same team into a single team node', () => {
    const { nodes } = buildImpactGraph('React', [
      row({ systemName: 'sys-a' }),
      row({ systemName: 'sys-b' })
    ])

    expect(nodes.filter(n => n.type === 'team')).toHaveLength(1)
    expect(nodes.find(n => n.type === 'team')).toMatchObject({ systemCount: 2 })
  })

  it('passes versions through unchanged on the system node', () => {
    const { nodes } = buildImpactGraph('React', [row({ versions: ['1.0.0', '2.0.0'] })])

    expect(nodes.find(n => n.id === 'system:sys-a')).toMatchObject({ versions: ['1.0.0', '2.0.0'] })
  })
})

describe('[contract] buildImpactGraph() compliance gap', () => {
  it('marks a system node and its team->system edge as a compliance gap when approved is false', () => {
    const { nodes, edges } = buildImpactGraph('React', [row({ approved: false, time: null })])

    expect(nodes.find(n => n.id === 'system:sys-a')).toMatchObject({ complianceGap: true })
    expect(edges.find(e => e.target === 'system:sys-a')).toMatchObject({ complianceGap: true })
  })

  it('does not mark a system as a compliance gap when approved is true', () => {
    const { nodes, edges } = buildImpactGraph('React', [row({ approved: true, time: 'invest' })])

    expect(nodes.find(n => n.id === 'system:sys-a')).toMatchObject({ complianceGap: false })
    expect(edges.find(e => e.target === 'system:sys-a')).toMatchObject({ complianceGap: false })
  })

  it('buckets a system with no owning team under a synthetic unowned team node, always as a compliance gap', () => {
    const { nodes, edges } = buildImpactGraph('React', [
      row({ ownerTeamName: null, approved: true, time: 'invest' })
    ])

    const teamNode = nodes.find(n => n.type === 'team')
    expect(teamNode).toMatchObject({ id: UNOWNED_TEAM_ID, complianceGap: true })
    expect(nodes.find(n => n.type === 'system')).toMatchObject({ complianceGap: true })
    expect(edges.find(e => e.source === UNOWNED_TEAM_ID)).toMatchObject({ complianceGap: true })
  })

  it('marks a team node as a gap only when ALL of its systems are gaps', () => {
    const { nodes } = buildImpactGraph('React', [
      row({ systemName: 'sys-a', approved: false, time: null }),
      row({ systemName: 'sys-b', approved: true, time: 'invest' })
    ])

    expect(nodes.find(n => n.type === 'team')).toMatchObject({ complianceGap: false })
  })

  it('marks a team node as a gap when all of its systems are gaps', () => {
    const { nodes } = buildImpactGraph('React', [
      row({ systemName: 'sys-a', approved: false, time: null }),
      row({ systemName: 'sys-b', approved: false, time: null })
    ])

    expect(nodes.find(n => n.type === 'team')).toMatchObject({ complianceGap: true })
  })
})

describe('[pin] buildImpactGraph() mixed-TIME team severity', () => {
  it('uses the eliminate > migrate > tolerate > invest tie-break for a team with mixed approved TIME values', () => {
    const { nodes } = buildImpactGraph('React', [
      row({ systemName: 'sys-a', approved: true, time: 'invest' }),
      row({ systemName: 'sys-b', approved: true, time: 'migrate' }),
      row({ systemName: 'sys-c', approved: true, time: 'tolerate' })
    ])

    expect(nodes.find(n => n.type === 'team')).toMatchObject({ time: 'migrate' })
  })
})
