import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import listHandler from '../../../server/api/version-sprawl/index.get'
import summaryHandler from '../../../server/api/version-sprawl/summary.get'
import { versionSprawlService } from '../../../server/services/singletons'
import type { VersionSprawlDetection } from '../../../types/api'

vi.mock('../../../server/services/singletons', () => ({
  versionSprawlService: {
    detect: vi.fn(),
    getSummary: vi.fn()
  }
}))

const highDetection: VersionSprawlDetection = {
  technologyName: 'react',
  versions: ['16.8.0', '17.0.2', '18.3.1', '18.0.0', '19.0.0'],
  versionCount: 5,
  versionRange: { oldest: '16.8.0', newest: '19.0.0' },
  affectedSystemCount: 23,
  versionBreakdown: [],
  sprawlScore: 90,
  severity: 'high',
  recommendedVersion: '19.0.0',
  hasEolVersion: true
}

const lowDetection: VersionSprawlDetection = {
  ...highDetection,
  technologyName: 'lodash',
  versions: ['4.17.20', '4.17.21'],
  versionCount: 2,
  severity: 'low',
  sprawlScore: 20,
  hasEolVersion: false
}

beforeEach(() => {
  vi.clearAllMocks()
  const store = new Map<string, unknown>()
  vi.stubGlobal('useStorage', () => ({
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => { store.set(key, value) })
  }))
})

describe('GET /api/version-sprawl', () => {
  it('returns all detections', async () => {
    vi.mocked(versionSprawlService.detect).mockResolvedValue([highDetection, lowDetection])

    const result = await listHandler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 2 })
    expect(result.data).toHaveLength(2)
  })

  it('filters by severity', async () => {
    vi.mocked(versionSprawlService.detect).mockResolvedValue([highDetection, lowDetection])

    const result = await listHandler(mockEvent({ query: { severity: 'high' } }))

    expect(result.data).toEqual([highDetection])
  })

  it('ignores an invalid severity filter', async () => {
    vi.mocked(versionSprawlService.detect).mockResolvedValue([highDetection, lowDetection])

    const result = await listHandler(mockEvent({ query: { severity: 'bogus' } }))

    expect(result.data).toHaveLength(2)
  })

  it('returns 500 when detection fails', async () => {
    vi.mocked(versionSprawlService.detect).mockRejectedValue(new Error('boom'))

    const result = await listHandler(mockEvent())

    expect(result).toMatchObject({ success: false, error: 'boom', data: [] })
  })
})

describe('GET /api/version-sprawl/summary', () => {
  it('returns severity counts', async () => {
    vi.mocked(versionSprawlService.getSummary).mockResolvedValue({ high: 1, medium: 0, low: 1, total: 2 })

    const result = await summaryHandler()

    expect(result).toEqual({ success: true, data: { high: 1, medium: 0, low: 1, total: 2 }, count: 1 })
  })
})
