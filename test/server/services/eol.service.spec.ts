import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EOLService } from '../../../server/services/eol.service'

function createStorage() {
  const cache = new Map<string, unknown>()
  return {
    getItem: vi.fn(async (key: string) => cache.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      cache.set(key, value)
    })
  }
}

const nodeProduct = {
  result: {
    name: 'nodejs',
    label: 'Node.js',
    links: { html: 'https://endoflife.date/nodejs' },
    releases: [
      {
        name: '24',
        isLts: true,
        isEol: false,
        eolFrom: '2028-04-30',
        eoasFrom: '2026-10-20',
        latest: { name: '24.16.0', date: '2026-05-21' }
      },
      {
        name: '25',
        isLts: false,
        isEol: true,
        eolFrom: '2026-06-01',
        eoasFrom: '2026-04-01',
        latest: { name: '25.9.0', date: '2026-04-01' }
      }
    ]
  }
}

describe('EOLService', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-02T00:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps known aliases before fetching product lifecycle data', async () => {
    const storage = createStorage()
    const fetcher = vi.fn(async () => nodeProduct)
    const service = new EOLService(fetcher as never, () => storage)

    const status = await service.getEOLStatus({
      name: 'node',
      version: '24.16.0',
      packageManager: 'npm',
      group: '@types'
    })

    expect(fetcher).toHaveBeenCalledWith('https://endoflife.date/api/v1/products/nodejs/')
    expect(status).toMatchObject({
      status: 'active',
      productName: 'nodejs',
      matchedCycle: '24',
      lts: true,
      latestVersion: '24.16.0'
    })
  })

  it('marks already ended cycles as unsupported', async () => {
    const storage = createStorage()
    const service = new EOLService(vi.fn(async () => nodeProduct) as never, () => storage)

    const status = await service.getEOLStatus({
      name: 'node',
      version: '25.9.0'
    })

    expect(status.status).toBe('unsupported')
    expect(status.eolDate).toBe('2026-06-01')
  })

  it('returns unknown when no release cycle matches the component version', async () => {
    const storage = createStorage()
    const service = new EOLService(vi.fn(async () => nodeProduct) as never, () => storage)

    const status = await service.getEOLStatus({
      name: 'node',
      version: '99.0.0'
    })

    expect(status).toMatchObject({
      status: 'unknown',
      reason: 'no_matching_cycle',
      productName: 'nodejs'
    })
  })

  it('caches fetched product data for repeated lookups', async () => {
    const storage = createStorage()
    const fetcher = vi.fn(async () => nodeProduct)
    const service = new EOLService(fetcher as never, () => storage)

    await service.getEOLStatus({ name: 'node', version: '24.16.0' })
    await service.getEOLStatus({ name: 'node', version: '24.15.0' })

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('returns an unknown read-only status when the upstream fetch fails', async () => {
    const storage = createStorage()
    const service = new EOLService(vi.fn(async () => {
      throw new Error('network unavailable')
    }) as never, () => storage)

    const status = await service.getEOLStatus({
      name: 'node',
      version: '24.16.0'
    })

    expect(status).toMatchObject({
      status: 'unknown',
      reason: 'fetch_failed'
    })
  })
})
