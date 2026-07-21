import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/sboms.post'
import { sbomService } from '../../../server/services/singletons'
import { getSbomValidator } from '../../../server/utils/sbom-validator'
import type { ValidationResult } from '../../../server/utils/sbom-validator'

vi.mock('../../../server/services/singletons', () => ({
  sbomService: { processSBOM: vi.fn() }
}))

vi.mock('../../../server/utils/sbom-validator')

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const validCycloneDxSbom = {
  bomFormat: 'CycloneDX', specVersion: '1.4', version: 1,
  metadata: { component: { type: 'application', name: 'test-app', version: '1.0.0' } },
  components: []
}

const validSpdxSbom = {
  spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0', SPDXID: 'SPDXRef-DOCUMENT',
  name: 'test-sbom', documentNamespace: 'https://example.com/test',
  creationInfo: { created: '2024-01-01T00:00:00Z', creators: ['Tool: test'] }
}

const validResult: ValidationResult = { valid: true, format: 'cyclonedx', errors: [] }
const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetImpersonatorId.mockResolvedValue(null)
})

describe('[contract] POST /api/sboms — Content-Type enforcement', () => {
  it('should return 415 when Content-Type is not application/json', async () => {
    const result = await handler(mockEvent({ headers: { 'content-type': 'text/plain' }, body: {} }))

    expect(result).toMatchObject({ success: false, error: 'unsupported_media_type', required: 'application/json' })
  })

  it('should return 415 when Content-Type header is absent', async () => {
    const result = await handler(mockEvent({ body: {} }))

    expect(result).toMatchObject({ success: false, error: 'unsupported_media_type' })
  })
})

describe('[contract] POST /api/sboms — authentication', () => {
  it('should return 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthenticated'))

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: false, error: 'unauthenticated' })
  })
})

describe('[contract] POST /api/sboms — request validation', () => {
  beforeEach(() => { mockRequireAuth.mockResolvedValue(user) })

  it('should return 400 when repositoryUrl is missing', async () => {
    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: false, error: 'invalid_request', message: expect.stringContaining('repositoryUrl') })
  })

  it('should return 400 when repositoryUrl is not a valid URL', async () => {
    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'not-a-url', sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: false, error: 'invalid_request', message: expect.stringContaining('URL') })
  })

  it('should return 400 when sbom field is missing', async () => {
    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo' }
    }))

    expect(result).toMatchObject({ success: false, error: 'invalid_request', message: expect.stringContaining('sbom') })
  })
})

describe('[contract] POST /api/sboms — SBOM validation', () => {
  beforeEach(() => { mockRequireAuth.mockResolvedValue(user) })

  it('should return 422 when SBOM schema is invalid', async () => {
    vi.mocked(getSbomValidator).mockReturnValue({
      validate: vi.fn().mockReturnValue({
        valid: false, format: 'unknown',
        errors: [{ instancePath: '/bomFormat', message: 'must be equal to one of the allowed values' }]
      } as ValidationResult)
    } as ReturnType<typeof getSbomValidator>)

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: { invalid: 'structure' } }
    }))

    expect(result).toMatchObject({ success: false, error: 'invalid_sbom' })
    expect((result as { validationErrors?: unknown[] }).validationErrors).toBeInstanceOf(Array)
  })

  it('should return 500 when validator throws', async () => {
    vi.mocked(getSbomValidator).mockReturnValue({
      validate: vi.fn().mockImplementation(() => { throw new Error('Internal validation error') })
    } as ReturnType<typeof getSbomValidator>)

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: false, error: 'internal_error' })
  })
})

describe('[contract] POST /api/sboms — successful processing', () => {
  beforeEach(() => { mockRequireAuth.mockResolvedValue(user) })

  it('should process a valid CycloneDX SBOM and return success', async () => {
    vi.mocked(getSbomValidator).mockReturnValue({
      validate: vi.fn().mockReturnValue(validResult)
    } as ReturnType<typeof getSbomValidator>)
    vi.mocked(sbomService.processSBOM).mockResolvedValue({
      systemName: 'test-app', componentsAdded: 5, componentsUpdated: 2, relationshipsCreated: 7
    })

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: true, format: 'cyclonedx', systemName: 'test-app', componentsAdded: 5 })
  })

  it('should process a valid SPDX SBOM and return success', async () => {
    vi.mocked(getSbomValidator).mockReturnValue({
      validate: vi.fn().mockReturnValue({ valid: true, format: 'spdx', errors: [] } as ValidationResult)
    } as ReturnType<typeof getSbomValidator>)
    vi.mocked(sbomService.processSBOM).mockResolvedValue({
      systemName: 'test-app', componentsAdded: 3, componentsUpdated: 0, relationshipsCreated: 3
    })

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: validSpdxSbom }
    }))

    expect(result).toMatchObject({ success: true, format: 'spdx' })
  })

  it('should return repository_not_registered when no system matches the repository URL', async () => {
    vi.mocked(getSbomValidator).mockReturnValue({
      validate: vi.fn().mockReturnValue(validResult)
    } as ReturnType<typeof getSbomValidator>)
    vi.mocked(sbomService.processSBOM).mockRejectedValue(
      Object.assign(new Error('No system found'), { statusCode: 404 })
    )

    const result = await handler(mockEvent({
      headers: { 'content-type': 'application/json' },
      body: { repositoryUrl: 'https://github.com/org/repo', sbom: validCycloneDxSbom }
    }))

    expect(result).toMatchObject({ success: false, error: 'repository_not_registered' })
  })
})
