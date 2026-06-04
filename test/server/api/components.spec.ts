import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/components.get'
import { componentService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findAll: vi.fn() }
}))

const mockComponent = {
  name: 'react', version: '18.2.0', packageManager: 'npm',
  purl: 'pkg:npm/react@18.2.0', cpe: null, bomRef: null, type: 'library',
  group: null, scope: 'required', hashes: [], licenses: [],
  copyright: null, supplier: null, author: null, publisher: null,
  homepage: null, externalReferences: [], description: null,
  releaseDate: null, publishedDate: null, modifiedDate: null,
  technologyName: 'React', systemCount: 5
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/components', () => {
  it('should return components with count and total', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [mockComponent], count: 1, total: 1 })

    const result = await handler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 1, total: 1 })
    expect(result.data).toHaveLength(1)
  })

  it('should return empty array when no components exist', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    const result = await handler(mockEvent())

    expect(result).toMatchObject({ success: true, count: 0 })
    expect(result.data).toHaveLength(0)
  })

  it('should return 400 on non-numeric limit', async () => {
    const result = await handler(mockEvent({ query: { limit: 'abc' } }))

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('limit') })
  })

  it('should clamp limit to 200 maximum', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { limit: '999' } }))

    expect(componentService.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }))
  })

  it('should clamp limit to 1 minimum', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { limit: '0' } }))

    expect(componentService.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }))
  })

  it('should pass search filter to service', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { search: 'react' } }))

    expect(componentService.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'react' }))
  })

  it('should coerce hasLicense string to boolean', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { hasLicense: 'true' } }))

    expect(componentService.findAll).toHaveBeenCalledWith(expect.objectContaining({ hasLicense: true }))
  })

  it('should pass includeDev=false to the service', async () => {
    vi.mocked(componentService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })

    await handler(mockEvent({ query: { includeDev: 'false' } }))

    expect(componentService.findAll).toHaveBeenCalledWith(expect.objectContaining({ includeDev: false }))
  })

  it('should return error response on service failure', async () => {
    vi.mocked(componentService.findAll).mockRejectedValue(new Error('Database connection failed'))

    const result = await handler(mockEvent())

    expect(result).toMatchObject({ success: false, error: 'Database connection failed' })
  })
})
