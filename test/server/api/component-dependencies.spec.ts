import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import { encodeComponentKey } from '../../../utils/component-identity'
import handler from '../../../server/api/components/[key]/dependencies.get'
import { componentService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  componentService: { findDependencies: vi.fn() }
}))

const mockComponent = {
  name: 'node',
  version: '24.16.0',
  packageManager: 'npm',
  purl: 'pkg:npm/node@24.16.0',
  group: null
}

const mockTree = {
  dependencies: [
    {
      name: 'semver',
      group: null,
      version: '7.6.3',
      packageManager: 'npm',
      purl: 'pkg:npm/semver@7.6.3',
      scope: 'runtime' as const,
      isDirect: true,
      depth: 1,
      children: []
    }
  ],
  totalCount: 1,
  hasCircularDependencies: false,
  truncated: false,
  maxDepth: 10,
  systemExists: true
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/components/{key}/dependencies', () => {
  it('returns a dependency tree', async () => {
    vi.mocked(componentService.findDependencies).mockResolvedValue(mockTree)

    const key = encodeComponentKey(mockComponent)
    const result = await handler(mockEvent({
      params: { key },
      query: { system: 'catalog', scope: 'runtime,dev' }
    }))

    expect(componentService.findDependencies).toHaveBeenCalledWith(
      { purl: 'pkg:npm/node@24.16.0' },
      {
        system: 'catalog',
        scopes: ['runtime', 'dev'],
        maxDepth: 10,
        limit: 500
      }
    )
    expect(result).toMatchObject({
      success: true,
      data: {
        componentKey: key,
        dependencies: mockTree.dependencies,
        totalCount: 1,
        hasCircularDependencies: false,
        truncated: false,
        maxDepth: 10
      }
    })
  })

  it('rejects malformed component keys', async () => {
    await expect(handler(mockEvent({ params: { key: 'invalid' } }))).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('rejects scope filtering without a system', async () => {
    const key = encodeComponentKey(mockComponent)

    await expect(handler(mockEvent({
      params: { key },
      query: { scope: 'runtime' }
    }))).rejects.toMatchObject({
      statusCode: 400,
      message: 'scope filter requires system query parameter'
    })
  })

  it('rejects unknown scopes', async () => {
    const key = encodeComponentKey(mockComponent)

    await expect(handler(mockEvent({
      params: { key },
      query: { system: 'catalog', scope: 'compile' }
    }))).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid scope 'compile'"
    })
  })

  it('clamps maxDepth and limit to server caps', async () => {
    vi.mocked(componentService.findDependencies).mockResolvedValue({
      ...mockTree,
      maxDepth: 10
    })
    const key = encodeComponentKey(mockComponent)

    await handler(mockEvent({
      params: { key },
      query: { maxDepth: '99', limit: '999' }
    }))

    expect(componentService.findDependencies).toHaveBeenCalledWith(
      { purl: 'pkg:npm/node@24.16.0' },
      expect.objectContaining({
        maxDepth: 10,
        limit: 500
      })
    )
  })

  it('returns 404 when the component does not exist', async () => {
    vi.mocked(componentService.findDependencies).mockResolvedValue(null)
    const key = encodeComponentKey(mockComponent)

    await expect(handler(mockEvent({ params: { key } }))).rejects.toMatchObject({
      statusCode: 404,
      message: 'Component not found'
    })
  })

  it('returns 404 when a system filter references a missing system', async () => {
    vi.mocked(componentService.findDependencies).mockResolvedValue({
      ...mockTree,
      dependencies: [],
      totalCount: 0,
      systemExists: false
    })
    const key = encodeComponentKey(mockComponent)

    await expect(handler(mockEvent({
      params: { key },
      query: { system: 'missing-system' }
    }))).rejects.toMatchObject({
      statusCode: 404,
      message: "System 'missing-system' not found"
    })
  })
})
