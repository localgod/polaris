import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SBOMService } from '../../../server/services/sbom.service'
import { SystemRepository } from '../../../server/repositories/system.repository'
import { SBOMRepository } from '../../../server/repositories/sbom.repository'
import { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'

vi.mock('../../../server/repositories/system.repository')
vi.mock('../../../server/repositories/sbom.repository')
vi.mock('../../../server/repositories/source-repository.repository')

describe('SBOMService', () => {
  let service: SBOMService

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
        hashes: [{ alg: 'SHA-256', content: 'abc123def456' }],
        licenses: [{ license: { id: 'MIT', name: 'MIT License' } }],
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
        checksums: [{ algorithm: 'SHA256', checksumValue: 'abc123def456' }],
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
    service = new SBOMService()

    // Default mocks for common repo calls
    vi.mocked(SourceRepositoryRepository.prototype.findByUrl).mockResolvedValue({
      url: 'https://github.com/org/repo',
      name: 'repo',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      lastSbomScanAt: null,
      systemCount: 1
    })
    vi.mocked(SystemRepository.prototype.findByRepositoryUrl).mockResolvedValue({
      name: 'test-system'
    })
    vi.mocked(SourceRepositoryRepository.prototype.updateLastScan).mockResolvedValue()
  })

  describe('processSBOM', () => {
    it('should process CycloneDX SBOM successfully', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 2
      })

      const result = await service.processSBOM({
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
      expect(SourceRepositoryRepository.prototype.findByUrl).toHaveBeenCalledOnce()
      expect(SystemRepository.prototype.findByRepositoryUrl).toHaveBeenCalledOnce()
      expect(SBOMRepository.prototype.persistSBOM).toHaveBeenCalledOnce()
      expect(SourceRepositoryRepository.prototype.updateLastScan).toHaveBeenCalledOnce()
    })

    it('should process SPDX SBOM successfully', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      const result = await service.processSBOM({
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
    })

    it('should normalize repository URL', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo.git/',
        format: 'cyclonedx'
      })

      // normalizeRepoUrl is called internally — verify the downstream calls use normalized URL
      expect(SystemRepository.prototype.findByRepositoryUrl).toHaveBeenCalledWith('https://github.com/org/repo')
    })

    it('should throw error when repository not registered', async () => {
      vi.mocked(SourceRepositoryRepository.prototype.findByUrl).mockResolvedValue(null)

      await expect(
        service.processSBOM({
          sbom: validCycloneDxSbom,
          repositoryUrl: 'https://github.com/org/unknown',
          format: 'cyclonedx'
        })
      ).rejects.toThrow('Repository not registered')

      expect(SBOMRepository.prototype.persistSBOM).not.toHaveBeenCalled()
    })

    it('should extract components from CycloneDX metadata', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 2,
        componentsUpdated: 0,
        relationshipsCreated: 2
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components).toHaveLength(2) // metadata.component + components[0]
      expect(persistCall.components[0].name).toBe('test-app')
      expect(persistCall.components[1].name).toBe('lodash')
    })

    it('should extract components from SPDX packages', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validSpdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components).toHaveLength(1)
      expect(persistCall.components[0].name).toBe('lodash')
      expect(persistCall.components[0].purl).toBe('pkg:npm/lodash@4.17.21')
    })

    it('should extract package manager from purl', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components[1].packageManager).toBe('npm')
    })

    it('should extract hashes correctly from CycloneDX', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      const lodashComponent = persistCall.components.find(c => c.name === 'lodash')

      expect(lodashComponent?.hashes).toHaveLength(1)
      expect(lodashComponent?.hashes[0]).toEqual({
        algorithm: 'SHA-256',
        value: 'abc123def456'
      })
    })

    it('should extract licenses correctly from CycloneDX', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      const lodashComponent = persistCall.components.find(c => c.name === 'lodash')

      expect(lodashComponent?.licenses).toHaveLength(1)
      expect(lodashComponent?.licenses[0]).toEqual({
        id: 'MIT',
        name: 'MIT License',
        url: null,
        text: null,
        expression: null
      })
    })

    it('should extract licenses correctly from SPDX', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validSpdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
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

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 3,
        componentsUpdated: 0,
        relationshipsCreated: 3
      })

      await service.processSBOM({
        sbom: sbomWithNested,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components).toHaveLength(3) // metadata + component + nested
      expect(persistCall.components.some(c => c.name === 'nested-lib')).toBe(true)
    })
  })
})
