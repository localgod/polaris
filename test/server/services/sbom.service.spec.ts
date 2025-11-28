import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SBOMService } from '../../../server/services/sbom.service'
import type { SystemRepository } from '../../../server/repositories/system.repository'
import type { SBOMRepository } from '../../../server/repositories/sbom.repository'
import type { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'

// Mock the repositories
vi.mock('../../../server/repositories/system.repository')
vi.mock('../../../server/repositories/sbom.repository')
vi.mock('../../../server/repositories/source-repository.repository')

describe('SBOMService', () => {
  let sbomService: SBOMService
  let mockSystemRepo: SystemRepository
  let mockSbomRepo: SBOMRepository
  let mockSourceRepoRepo: SourceRepositoryRepository

  const validCycloneDxSbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        name: 'test-app',
        version: '1.0.0',
        purl: 'pkg:npm/test-app@1.0.0'
      }
    },
    components: [
      {
        type: 'library',
        name: 'lodash',
        version: '4.17.21',
        purl: 'pkg:npm/lodash@4.17.21',
        'bom-ref': 'pkg:npm/lodash@4.17.21',
        hashes: [
          {
            alg: 'SHA-256',
            content: 'abc123def456'
          }
        ],
        licenses: [
          {
            license: {
              id: 'MIT',
              name: 'MIT License'
            }
          }
        ],
        description: 'Lodash modular utilities',
        homepage: 'https://lodash.com'
      }
    ]
  }

  const validSpdxSbom = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: 'test-sbom',
    documentNamespace: 'https://example.com/test',
    creationInfo: {
      created: '2024-01-01T00:00:00Z',
      creators: ['Tool: test']
    },
    packages: [
      {
        SPDXID: 'SPDXRef-Package-lodash',
        name: 'lodash',
        versionInfo: '4.17.21',
        downloadLocation: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
        filesAnalyzed: false,
        licenseConcluded: 'MIT',
        licenseDeclared: 'MIT',
        copyrightText: 'Copyright JS Foundation',
        checksums: [
          {
            algorithm: 'SHA256',
            checksumValue: 'abc123def456'
          }
        ],
        externalRefs: [
          {
            referenceCategory: 'PACKAGE-MANAGER',
            referenceType: 'purl',
            referenceLocator: 'pkg:npm/lodash@4.17.21'
          }
        ],
        homepage: 'https://lodash.com',
        description: 'Lodash modular utilities'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sbomService = new SBOMService()
    
    // Get mocked instances (accessing private properties for testing)
    mockSystemRepo = (sbomService as unknown as { systemRepo: SystemRepository }).systemRepo
    mockSbomRepo = (sbomService as unknown as { sbomRepo: SBOMRepository }).sbomRepo
    mockSourceRepoRepo = (sbomService as unknown as { sourceRepoRepo: SourceRepositoryRepository }).sourceRepoRepo
  })

  describe('processSBOM', () => {
    beforeEach(() => {
      // Mock repository found for all tests (can be overridden in specific tests)
      vi.spyOn(mockSourceRepoRepo, 'findByUrl').mockResolvedValue({
        url: 'https://github.com/org/repo',
        name: 'repo',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        lastSbomScanAt: null,
        systemCount: 1
      })

      // Mock system found for all tests (can be overridden in specific tests)
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      // Mock updateLastScan for all tests
      vi.spyOn(mockSourceRepoRepo, 'updateLastScan').mockResolvedValue()
    })

    it('should process CycloneDX SBOM successfully', async () => {
      // Mock persistence
      vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 2
      })

      const result = await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      expect(result).toEqual({
        systemName: 'test-system',
        repositoryUrl: 'https://github.com/org/repo',
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 2
      })

      expect(mockSourceRepoRepo.findByUrl).toHaveBeenCalledWith('https://github.com/org/repo')
      expect(mockSystemRepo.findByRepositoryUrl).toHaveBeenCalledWith('https://github.com/org/repo')
      expect(mockSbomRepo.persistSBOM).toHaveBeenCalled()
      expect(mockSourceRepoRepo.updateLastScan).toHaveBeenCalledWith('https://github.com/org/repo')
    })

    it('should process SPDX SBOM successfully', async () => {
      // Mock persistence
      vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      const result = await sbomService.processSBOM({
        sbom: validSpdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx'
      })

      expect(result).toEqual({
        systemName: 'test-system',
        repositoryUrl: 'https://github.com/org/repo',
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      expect(mockSystemRepo.findByRepositoryUrl).toHaveBeenCalledWith('https://github.com/org/repo')
      expect(mockSbomRepo.persistSBOM).toHaveBeenCalled()
    })

    it('should normalize repository URL', async () => {
      vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo.git/',
        format: 'cyclonedx'
      })

      // Should normalize to remove .git and trailing slash
      expect(mockSystemRepo.findByRepositoryUrl).toHaveBeenCalledWith('https://github.com/org/repo')
    })

    it('should throw error when repository not registered', async () => {
      // Mock repository not found
      vi.spyOn(mockSourceRepoRepo, 'findByUrl').mockResolvedValue(null)

      await expect(
        sbomService.processSBOM({
          sbom: validCycloneDxSbom,
          repositoryUrl: 'https://github.com/org/unknown',
          format: 'cyclonedx'
        })
      ).rejects.toThrow('Repository not registered')

      expect(mockSbomRepo.persistSBOM).not.toHaveBeenCalled()
    })

    it('should extract components from CycloneDX metadata', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 2
      })

      await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      expect(persistCall.components).toHaveLength(2) // metadata.component + components[0]
      expect(persistCall.components[0].name).toBe('test-app')
      expect(persistCall.components[1].name).toBe('lodash')
    })

    it('should extract components from SPDX packages', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validSpdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      expect(persistCall.components).toHaveLength(1)
      expect(persistCall.components[0].name).toBe('lodash')
      expect(persistCall.components[0].purl).toBe('pkg:npm/lodash@4.17.21')
    })

    it('should extract package manager from purl', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      expect(persistCall.components[1].packageManager).toBe('npm')
    })

    it('should extract hashes correctly from CycloneDX', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      const lodashComponent = persistCall.components.find(c => c.name === 'lodash')
      
      expect(lodashComponent?.hashes).toHaveLength(1)
      expect(lodashComponent?.hashes[0]).toEqual({
        algorithm: 'SHA-256',
        value: 'abc123def456'
      })
    })

    it('should extract licenses correctly from CycloneDX', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      const lodashComponent = persistCall.components.find(c => c.name === 'lodash')
      
      expect(lodashComponent?.licenses).toHaveLength(1)
      expect(lodashComponent?.licenses[0]).toEqual({
        id: 'MIT',
        name: 'MIT License',
        url: null,
        text: null
      })
    })

    it('should extract licenses correctly from SPDX', async () => {
      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await sbomService.processSBOM({
        sbom: validSpdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      
      expect(persistCall.components[0].licenses).toHaveLength(1)
      expect(persistCall.components[0].licenses[0].id).toBe('MIT')
    })

    it('should handle nested CycloneDX components', async () => {
      const sbomWithNested = {
        ...validCycloneDxSbom,
        components: [
          {
            ...validCycloneDxSbom.components[0],
            components: [
              {
                type: 'library',
                name: 'nested-lib',
                version: '1.0.0',
                purl: 'pkg:npm/nested-lib@1.0.0'
              }
            ]
          }
        ]
      }

      vi.spyOn(mockSystemRepo, 'findByRepositoryUrl').mockResolvedValue({
        name: 'test-system'
      })

      const persistSpy = vi.spyOn(mockSbomRepo, 'persistSBOM').mockResolvedValue({
        componentsAdded: 3,
        componentsUpdated: 0,
        relationshipsCreated: 3
      })

      await sbomService.processSBOM({
        sbom: sbomWithNested,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = persistSpy.mock.calls[0][0]
      expect(persistCall.components).toHaveLength(3) // metadata + component + nested
      expect(persistCall.components.some(c => c.name === 'nested-lib')).toBe(true)
    })
  })
})
