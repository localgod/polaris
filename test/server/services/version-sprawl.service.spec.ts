import { describe, it, expect, vi } from 'vitest'
import { VersionSprawlService } from '../../../server/services/version-sprawl.service'
import type { EOLStatus } from '../../../types/api'
import type { VersionSprawlRaw } from '../../../server/repositories/component.repository'

const activeStatus: EOLStatus = {
  status: 'active',
  productName: 'react',
  productLabel: 'React',
  matchedCycle: '18',
  eolDate: null,
  supportEndDate: null,
  daysUntilEOL: null,
  daysSinceEOL: null,
  lts: true,
  latestVersion: '18.3.1',
  latestReleaseDate: null,
  source: { name: 'endoflife.date', url: 'https://endoflife.date/react' }
}

const unsupportedStatus: EOLStatus = { ...activeStatus, status: 'unsupported' }

function makeGroup(overrides: Partial<VersionSprawlRaw> = {}): VersionSprawlRaw {
  return {
    technologyName: 'react',
    versions: ['16.8.0', '17.0.2', '18.3.1'],
    versionCount: 3,
    versionBreakdown: [
      { version: '16.8.0', systemCount: 2, systems: ['sys-a', 'sys-b'] },
      { version: '17.0.2', systemCount: 3, systems: ['sys-c', 'sys-d', 'sys-e'] },
      { version: '18.3.1', systemCount: 1, systems: ['sys-f'] }
    ],
    affectedSystemCount: 6,
    ...overrides
  }
}

describe('[pin] VersionSprawlService', () => {
  describe('detect()', () => {
    it('sorts versions ascending and recommends the newest one', async () => {
      const service = new VersionSprawlService(
        { findVersionSprawl: vi.fn(async () => [makeGroup({ versions: ['18.3.1', '16.8.0', '17.0.2'] })]) } as never,
        { getEOLStatus: vi.fn(async () => activeStatus) } as never
      )

      const [detection] = await service.detect()

      expect(detection.versions).toEqual(['16.8.0', '17.0.2', '18.3.1'])
      expect(detection.versionRange).toEqual({ oldest: '16.8.0', newest: '18.3.1' })
      expect(detection.recommendedVersion).toBe('18.3.1')
    })

    it('classifies severity by version count', async () => {
      const findVersionSprawl = vi.fn(async () => [
        makeGroup({ technologyName: 'low-tech', versions: ['1.0.0', '2.0.0'], versionCount: 2 }),
        makeGroup({ technologyName: 'medium-tech', versions: ['1.0.0', '2.0.0', '3.0.0'], versionCount: 3 }),
        makeGroup({ technologyName: 'high-tech', versions: ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0'], versionCount: 5 })
      ])
      const service = new VersionSprawlService(
        { findVersionSprawl } as never,
        { getEOLStatus: vi.fn(async () => activeStatus) } as never
      )

      const detections = await service.detect()
      const byTech = Object.fromEntries(detections.map(d => [d.technologyName, d.severity]))

      expect(byTech['low-tech']).toBe('low')
      expect(byTech['medium-tech']).toBe('medium')
      expect(byTech['high-tech']).toBe('high')
    })

    it('flags hasEolVersion and boosts the sprawl score when any version is unsupported', async () => {
      const service = new VersionSprawlService(
        { findVersionSprawl: vi.fn(async () => [makeGroup()]) } as never,
        {
          getEOLStatus: vi.fn(async ({ version }: { version: string }) =>
            version === '16.8.0' ? unsupportedStatus : activeStatus)
        } as never
      )

      const [withEol] = await service.detect()

      const serviceWithoutEol = new VersionSprawlService(
        { findVersionSprawl: vi.fn(async () => [makeGroup()]) } as never,
        { getEOLStatus: vi.fn(async () => activeStatus) } as never
      )
      const [withoutEol] = await serviceWithoutEol.detect()

      expect(withEol.hasEolVersion).toBe(true)
      expect(withoutEol.hasEolVersion).toBe(false)
      expect(withEol.sprawlScore).toBeGreaterThan(withoutEol.sprawlScore)
    })

    it('sorts detections by sprawl score descending', async () => {
      const findVersionSprawl = vi.fn(async () => [
        makeGroup({ technologyName: 'small', versions: ['1.0.0', '2.0.0'], versionCount: 2, affectedSystemCount: 1 }),
        makeGroup({ technologyName: 'big', versions: ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0'], versionCount: 5, affectedSystemCount: 20 })
      ])
      const service = new VersionSprawlService(
        { findVersionSprawl } as never,
        { getEOLStatus: vi.fn(async () => activeStatus) } as never
      )

      const detections = await service.detect()

      expect(detections[0].technologyName).toBe('big')
      expect(detections[0].sprawlScore).toBeGreaterThanOrEqual(detections[1].sprawlScore)
    })
  })

  describe('getSummary()', () => {
    it('counts detections per severity tier', async () => {
      const findVersionSprawl = vi.fn(async () => [
        makeGroup({ technologyName: 'low-tech', versions: ['1.0.0', '2.0.0'], versionCount: 2 }),
        makeGroup({ technologyName: 'high-tech', versions: ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0'], versionCount: 5 })
      ])
      const service = new VersionSprawlService(
        { findVersionSprawl } as never,
        { getEOLStatus: vi.fn(async () => activeStatus) } as never
      )

      const summary = await service.getSummary()

      expect(summary).toEqual({ high: 1, medium: 0, low: 1, total: 2 })
    })
  })
})
