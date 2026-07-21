import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import listHandler from '../../../server/api/licenses.get'
import getHandler from '../../../server/api/licenses/[id].get'
import statisticsHandler from '../../../server/api/licenses/statistics.get'
import { licenseService } from '../../../server/services/singletons'
import { LicenseRepository } from '../../../server/repositories/license.repository'

vi.mock('../../../server/services/singletons', () => ({
  licenseService: { findAll: vi.fn() }
}))

vi.mock('../../../server/repositories/license.repository')
vi.mock('spdx-license-list/full.js', () => ({ default: {} }))

const mockLicense = {
  id: 'MIT', name: 'MIT License', spdxId: 'MIT', osiApproved: true,
  url: 'https://opensource.org/licenses/MIT', category: 'permissive',
  text: null, deprecated: false, allowed: true,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', componentCount: 42
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('[pin] GET /api/licenses', () => {
  it('should return licenses with count and total', async () => {
    vi.mocked(licenseService.findAll).mockResolvedValue({ data: [mockLicense], count: 1, total: 1 })

    const result = await listHandler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 1, total: 1 })
    expect(result.data).toHaveLength(1)
  })

  it('should clamp limit to 200 maximum', async () => {
    vi.mocked(licenseService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await listHandler(mockEvent({ query: { limit: '999' } }))

    expect(licenseService.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }))
  })

  it('should clamp limit to 1 minimum', async () => {
    vi.mocked(licenseService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await listHandler(mockEvent({ query: { limit: '0' } }))

    expect(licenseService.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }))
  })

  it('should return error on non-numeric limit', async () => {
    const result = await listHandler(mockEvent({ query: { limit: 'abc' } }))

    expect(result).toMatchObject({ success: false })
  })

  it('should pass category filter to service', async () => {
    vi.mocked(licenseService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await listHandler(mockEvent({ query: { category: 'permissive' } }))

    expect(licenseService.findAll).toHaveBeenCalledWith(expect.objectContaining({ category: 'permissive' }))
  })

  it('should coerce osiApproved string to boolean', async () => {
    vi.mocked(licenseService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await listHandler(mockEvent({ query: { osiApproved: 'true' } }))

    expect(licenseService.findAll).toHaveBeenCalledWith(expect.objectContaining({ osiApproved: true }))
  })
})

describe('[pin] GET /api/licenses/:id', () => {
  it('should return 404 response when license is not found', async () => {
    vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

    const result = await getHandler(mockEvent({ params: { id: 'NONEXISTENT' } }))

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('not found') })
  })

  it('should return license data when found', async () => {
    vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(mockLicense)

    const result = await getHandler(mockEvent({ params: { id: 'MIT' } }))

    expect(result).toMatchObject({ success: true, count: 1 })
    expect(result.data[0]).toMatchObject({ id: 'MIT' })
  })

  it('should return error response when id param is missing', async () => {
    const result = await getHandler(mockEvent({ params: {} }))

    expect(result).toMatchObject({ success: false })
  })
})

describe('[pin] GET /api/licenses/statistics', () => {
  it('should return statistics from repository', async () => {
    const stats = { total: 10, byCategory: { permissive: 7, copyleft: 3 }, osiApproved: 8, deprecated: 1 }
    vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(stats)

    const result = await statisticsHandler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 1 })
    expect(result.data[0]).toEqual(stats)
  })

  it('should return error response on repository failure', async () => {
    vi.mocked(LicenseRepository.prototype.getStatistics).mockRejectedValue(new Error('DB error'))

    const result = await statisticsHandler(mockEvent())

    expect(result).toMatchObject({ success: false, error: 'DB error' })
  })
})
