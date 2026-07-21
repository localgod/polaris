import { describe, it, expect, vi } from 'vitest'
import { EOLRollupService } from '../../../server/services/eol-rollup.service'
import type { EOLStatus } from '../../../types/api'

const approachingNode: EOLStatus = {
  status: 'approaching_eol',
  productName: 'nodejs',
  productLabel: 'Node.js',
  matchedCycle: '24',
  eolDate: '2026-08-01',
  supportEndDate: null,
  daysUntilEOL: 45,
  daysSinceEOL: null,
  lts: true,
  latestVersion: '24.16.0',
  latestReleaseDate: null,
  source: { name: 'endoflife.date', url: 'https://endoflife.date/nodejs' }
}

const unsupportedNode: EOLStatus = {
  ...approachingNode,
  status: 'unsupported',
  matchedCycle: '16',
  eolDate: '2023-09-11',
  daysUntilEOL: null,
  daysSinceEOL: 1000
}

const activeReact: EOLStatus = {
  ...approachingNode,
  status: 'active',
  productName: 'react',
  productLabel: 'React',
  matchedCycle: '19',
  eolDate: null,
  daysUntilEOL: null,
  daysSinceEOL: null,
  source: { name: 'endoflife.date', url: 'https://endoflife.date/react' }
}

describe('[pin] EOLRollupService', () => {
  const candidates = [
    {
      name: 'node',
      version: '24.16.0',
      packageManager: 'npm',
      purl: 'pkg:npm/node@24.16.0',
      group: null,
      technologyName: 'Node.js',
      systems: [{ name: 'api' }, { name: 'worker' }]
    },
    {
      name: 'node',
      version: '16.20.2',
      packageManager: 'npm',
      purl: 'pkg:npm/node@16.20.2',
      group: null,
      technologyName: 'Node.js',
      systems: [{ name: 'legacy' }]
    },
    {
      name: 'react',
      version: '19.0.0',
      packageManager: 'npm',
      purl: 'pkg:npm/react@19.0.0',
      group: null,
      technologyName: 'React',
      systems: [{ name: 'web' }]
    }
  ]

  it('returns approaching component and technology rollups with affected systems', async () => {
    const service = new EOLRollupService(
      { findEOLCandidates: vi.fn(async () => candidates) } as never,
      {
        getApproachingDays: () => 90,
        getEOLStatus: vi.fn(async ({ version }: { version: string }) => {
          if (version.startsWith('24')) return approachingNode
          if (version.startsWith('16')) return unsupportedNode
          return activeReact
        })
      } as never
    )

    const result = await service.getApproaching()

    expect(result.windowDays).toBe(90)
    expect(result.summary).toEqual({ components: 1, technologies: 1, systems: 2 })
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'component', name: 'node', systemCount: 2 }),
      expect.objectContaining({ kind: 'technology', name: 'Node.js', componentCount: 1, systemCount: 2 })
    ]))
  })

  it('returns expired component and technology rollups separately', async () => {
    const service = new EOLRollupService(
      { findEOLCandidates: vi.fn(async () => candidates) } as never,
      {
        getApproachingDays: () => 90,
        getEOLStatus: vi.fn(async ({ version }: { version: string }) => (
          version.startsWith('16') ? unsupportedNode : activeReact
        ))
      } as never
    )

    const result = await service.getExpired()

    expect(result.summary).toEqual({ components: 1, technologies: 1, systems: 1 })
    expect(result.items.every(item => item.lifecycle.status === 'unsupported')).toBe(true)
  })
})
