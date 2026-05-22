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
    vi.mocked(SBOMRepository.prototype.upsertTeamUsesTechnology).mockResolvedValue()
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
      // metadata.component is the scanned system itself and is excluded
      expect(persistCall.components).toHaveLength(1)
      expect(persistCall.components[0].name).toBe('lodash')
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

    it('should decode percent-encoded @ in purl for scoped npm packages', async () => {
      const sbomWithScopedPackage = {
        ...validCycloneDxSbom,
        components: [
          {
            type: 'library',
            name: 'ui',
            version: '4.3.0',
            // cdxgen encodes @ as %40 in the namespace — must be normalized
            purl: 'pkg:npm/%40nuxt/ui@4.3.0',
            'bom-ref': 'pkg:npm/@nuxt/ui@4.3.0',
          }
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithScopedPackage,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components[0].purl).toBe('pkg:npm/@nuxt/ui@4.3.0')
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
      // metadata.component excluded; components[0] is lodash
      expect(persistCall.components[0].packageManager).toBe('npm')
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

    it('should extract CycloneDX dependencies and directDeps and pass them to persistSBOM', async () => {
      const sbomWithDeps = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'test-app',
            version: '1.0.0',
            'bom-ref': 'pkg:npm/test-app@1.0.0',
          }
        },
        dependencies: [
          { ref: 'pkg:npm/test-app@1.0.0', dependsOn: ['pkg:npm/lodash@4.17.21'] },
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithDeps,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.dependencies).toContainEqual({
        ref: 'pkg:npm/test-app@1.0.0',
        dependsOn: ['pkg:npm/lodash@4.17.21'],
      })
      // componentUsage is computed by BFS propagation in the service layer.
      // lodash is a direct dep with no scope set on the component → scope: null, isDirect: true.
      const lodashUsage = persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')
      expect(lodashUsage).toEqual({ bomRef: 'pkg:npm/lodash@4.17.21', scope: null, isDirect: true })
    })

    it('should extract SPDX dependency relationships and pass them to persistSBOM', async () => {
      const sbomWithRels = {
        ...validSpdxSbom,
        relationships: [
          {
            spdxElementId: 'SPDXRef-DOCUMENT',
            relationshipType: 'DEPENDS_ON',
            relatedSpdxElement: 'SPDXRef-Package-lodash',
          },
          {
            spdxElementId: 'SPDXRef-Package-lodash',
            relationshipType: 'DESCRIBES',
            relatedSpdxElement: 'SPDXRef-DOCUMENT',
          },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithRels,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      // Only DEPENDS_ON type should be included, not DESCRIBES
      expect(persistCall.dependencies).toContainEqual({
        ref: 'SPDXRef-DOCUMENT',
        dependsOn: ['SPDXRef-Package-lodash'],
      })
      expect(persistCall.dependencies).not.toContainEqual(
        expect.objectContaining({ ref: 'SPDXRef-Package-lodash' })
      )
    })

    it('should pass empty dependencies when SBOM has no dependency section', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.dependencies).toEqual([])
    })

    it('should resolve directDeps via fallback when root bom-ref type differs from dependencies entry', async () => {
      // Simulates cdxgen output when run without node_modules:
      // metadata.component uses type=application, but dependencies[] uses type=npm.
      const sbomWithTypeMismatch = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            'bom-ref': 'pkg:application/my-app@1.0.0',
          }
        },
        dependencies: [
          // The application-typed entry has no dependsOn (cdxgen quirk)
          { ref: 'pkg:application/my-app@1.0.0', dependsOn: [] },
          // The npm-typed entry has the real direct deps
          { ref: 'pkg:npm/my-app@1.0.0', dependsOn: ['pkg:npm/lodash@4.17.21', 'pkg:npm/express@4.18.2'] },
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
          { ref: 'pkg:npm/express@4.18.2', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 2, componentsUpdated: 0, relationshipsCreated: 2
      })

      await service.processSBOM({
        sbom: sbomWithTypeMismatch,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      // Both lodash and express are direct deps resolved via the name-fallback path.
      expect(persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/express@4.18.2')).toMatchObject({ isDirect: true })
    })

    it('should use exact match directDeps when root bom-ref matches a non-empty dependsOn entry', async () => {
      const sbomWithExactMatch = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            'bom-ref': 'pkg:npm/my-app@1.0.0',
          }
        },
        dependencies: [
          { ref: 'pkg:npm/my-app@1.0.0', dependsOn: ['pkg:npm/lodash@4.17.21'] },
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithExactMatch,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')).toMatchObject({ isDirect: true })
    })

    it('should return empty directDeps when no dependency entry matches the root name', async () => {
      const sbomNoMatch = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            'bom-ref': 'pkg:application/my-app@1.0.0',
          }
        },
        // No entry for my-app in dependencies at all
        dependencies: [
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomNoMatch,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      // No direct deps resolved — no component should have isDirect: true
      const anyDirect = [...persistCall.componentUsage.values()].some(u => u.isDirect)
      expect(anyDirect).toBe(false)
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
      // metadata.component excluded; component + nested = 2
      expect(persistCall.components).toHaveLength(2)
      expect(persistCall.components.some(c => c.name === 'nested-lib')).toBe(true)
    })

    it('should upsert Team→USES→Technology edges after persisting components', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: {
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
          components: [{ type: 'library', name: 'react', version: '18.0.0', purl: 'pkg:npm/react@18.0.0' }]
        },
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).toHaveBeenCalledOnce()
      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).toHaveBeenCalledWith('test-system')
    })

    it('should upsert Team→USES→Technology edges before updating last scan timestamp', async () => {
      const callOrder: string[] = []
      vi.mocked(SBOMRepository.prototype.upsertTeamUsesTechnology).mockImplementation(async () => { callOrder.push('upsert') })
      vi.mocked(SourceRepositoryRepository.prototype.updateLastScan).mockImplementation(async () => { callOrder.push('scan') })
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 0, componentsUpdated: 0, relationshipsCreated: 0
      })

      await service.processSBOM({
        sbom: { bomFormat: 'CycloneDX', specVersion: '1.4', components: [] },
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      expect(callOrder).toEqual(['upsert', 'scan'])
    })
  })
})
