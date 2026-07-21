import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SBOMService } from '../../../server/services/sbom.service'
import { SystemRepository } from '../../../server/repositories/system.repository'
import { SBOMRepository } from '../../../server/repositories/sbom.repository'
import { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'
import { HealthRefreshService } from '../../../server/services/health-refresh.service'

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

  describe('[pin] processSBOM', () => {
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

    it('should resolve directDeps case-insensitively when cdxgen lowercases npm root package refs', async () => {
      const sbomWithRootNameCasingMismatch = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'AzureMap',
            version: '1.0.0',
            'bom-ref': 'pkg:application/AzureMap@1.0.0',
          }
        },
        dependencies: [
          { ref: 'pkg:application/AzureMap@1.0.0', dependsOn: [] },
          { ref: 'pkg:npm/AzureMap@1.0.0', dependsOn: ['pkg:npm/@slidev/cli@52.0.0'] },
          {
            ref: 'pkg:npm/azuremap@1.0.0',
            dependsOn: [
              'pkg:npm/@actions/core@1.11.1',
              'pkg:npm/@azure/identity@4.10.2',
              'pkg:npm/commander@14.0.0'
            ]
          },
          { ref: 'pkg:npm/@slidev/cli@52.0.0', dependsOn: [] },
          { ref: 'pkg:npm/@actions/core@1.11.1', dependsOn: [] },
          { ref: 'pkg:npm/@azure/identity@4.10.2', dependsOn: [] },
          { ref: 'pkg:npm/commander@14.0.0', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 3, componentsUpdated: 0, relationshipsCreated: 3
      })

      await service.processSBOM({
        sbom: sbomWithRootNameCasingMismatch,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('pkg:npm/@actions/core@1.11.1')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/@azure/identity@4.10.2')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/commander@14.0.0')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/@slidev/cli@52.0.0')?.isDirect).not.toBe(true)
    })

    it('should mark direct deps correctly for SPDX SBOMs using the DESCRIBES+DEPENDS_ON pattern (Composer/cdxgen)', async () => {
      // Represents the real cdxgen Composer SBOM layout:
      // SPDXRef-DOCUMENT --DESCRIBES--> root package --DEPENDS_ON--> direct deps
      const composerSbom = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'karla-sbom',
        documentNamespace: 'https://example.com/karla',
        creationInfo: { created: '2024-01-01T00:00:00Z', creators: ['Tool: cdxgen'] },
        packages: [
          {
            SPDXID: 'SPDXRef-Package-karla',
            name: 'karla',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            copyrightText: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-symfony-console',
            name: 'symfony/console',
            versionInfo: '6.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/symfony/console@6.0.0' }],
          },
          {
            SPDXID: 'SPDXRef-Package-phpunit',
            name: 'phpunit/phpunit',
            versionInfo: '10.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'BSD-3-Clause',
            licenseDeclared: 'BSD-3-Clause',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/phpunit/phpunit@10.0.0' }],
          },
          {
            SPDXID: 'SPDXRef-Package-php-timer',
            name: 'phpunit/php-timer',
            versionInfo: '6.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'BSD-3-Clause',
            licenseDeclared: 'BSD-3-Clause',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/phpunit/php-timer@6.0.0' }],
          },
        ],
        relationships: [
          { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-Package-karla' },
          { spdxElementId: 'SPDXRef-Package-karla', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-Package-symfony-console' },
          { spdxElementId: 'SPDXRef-Package-karla', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-Package-phpunit' },
          { spdxElementId: 'SPDXRef-Package-phpunit', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-Package-php-timer' },
        ],
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 4, componentsUpdated: 0, relationshipsCreated: 4
      })

      await service.processSBOM({
        sbom: composerSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('SPDXRef-Package-symfony-console')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('SPDXRef-Package-phpunit')).toMatchObject({ isDirect: true })
      // php-timer is only required by phpunit, so it is transitive
      expect(persistCall.componentUsage.get('SPDXRef-Package-php-timer')).toMatchObject({ isDirect: false })
    })

    it('should correctly resolve isDirect and scope when SPDX uses inverse *_DEPENDENCY_OF relationship types', async () => {
      // SPDX inverse types: "A DEV_DEPENDENCY_OF B" means B depends on A (the edge is B→A).
      // The extractor must flip the direction so BFS and scope propagation work correctly.
      const sbomWithInverseRels = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'test-sbom',
        documentNamespace: 'https://example.com/test',
        creationInfo: { created: '2024-01-01T00:00:00Z', creators: ['Tool: cdxgen'] },
        packages: [
          {
            SPDXID: 'SPDXRef-Package-myapp',
            name: 'myapp',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            copyrightText: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-guzzle',
            name: 'guzzlehttp/guzzle',
            versionInfo: '7.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/guzzlehttp/guzzle@7.0.0' }],
          },
          {
            SPDXID: 'SPDXRef-Package-phpunit',
            name: 'phpunit/phpunit',
            versionInfo: '10.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'BSD-3-Clause',
            licenseDeclared: 'BSD-3-Clause',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/phpunit/phpunit@10.0.0' }],
          },
          {
            SPDXID: 'SPDXRef-Package-php-timer',
            name: 'phpunit/php-timer',
            versionInfo: '6.0.0',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'BSD-3-Clause',
            licenseDeclared: 'BSD-3-Clause',
            copyrightText: 'NOASSERTION',
            externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:composer/phpunit/php-timer@6.0.0' }],
          },
        ],
        relationships: [
          { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-Package-myapp' },
          // Inverse types: child is spdxElementId, parent is relatedSpdxElement
          { spdxElementId: 'SPDXRef-Package-guzzle', relationshipType: 'RUNTIME_DEPENDENCY_OF', relatedSpdxElement: 'SPDXRef-Package-myapp' },
          { spdxElementId: 'SPDXRef-Package-phpunit', relationshipType: 'DEV_DEPENDENCY_OF', relatedSpdxElement: 'SPDXRef-Package-myapp' },
          { spdxElementId: 'SPDXRef-Package-php-timer', relationshipType: 'DEV_DEPENDENCY_OF', relatedSpdxElement: 'SPDXRef-Package-phpunit' },
        ],
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 4, componentsUpdated: 0, relationshipsCreated: 4
      })

      await service.processSBOM({
        sbom: sbomWithInverseRels,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'spdx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('SPDXRef-Package-guzzle')).toMatchObject({ isDirect: true, scope: 'runtime' })
      expect(persistCall.componentUsage.get('SPDXRef-Package-phpunit')).toMatchObject({ isDirect: true, scope: 'dev' })
      // php-timer is only a dep of phpunit, so it is transitive
      expect(persistCall.componentUsage.get('SPDXRef-Package-php-timer')).toMatchObject({ isDirect: false })
    })

    it('should not throw when a dependency purl has a malformed encoded name segment', async () => {
      const sbomWithMalformedPurlName = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'bad%zzname',
            version: '1.0.0',
            'bom-ref': 'pkg:application/bad%zzname@1.0.0',
          }
        },
        dependencies: [
          { ref: 'pkg:application/bad%zzname@1.0.0', dependsOn: [] },
          { ref: 'pkg:npm/bad%zzname@1.0.0', dependsOn: ['pkg:npm/lodash@4.17.21'] },
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithMalformedPurlName,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')).toMatchObject({ isDirect: true })
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

    it('should resolve directDeps from root purl when CycloneDX metadata has no bom-ref', async () => {
      const sbomWithRootPurlOnly = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            purl: 'pkg:npm/my-app@1.0.0',
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
        sbom: sbomWithRootPurlOnly,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')).toMatchObject({ isDirect: true })
    })

    it('should use component purl as bomRef fallback for CycloneDX components without bom-ref', async () => {
      const sbomWithComponentPurlOnly = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            purl: 'pkg:npm/my-app@1.0.0',
          }
        },
        components: [
          {
            type: 'library',
            name: 'lodash',
            version: '4.17.21',
            purl: 'pkg:npm/lodash@4.17.21',
          }
        ],
        dependencies: [
          { ref: 'pkg:npm/my-app@1.0.0', dependsOn: ['pkg:npm/lodash@4.17.21'] },
          { ref: 'pkg:npm/lodash@4.17.21', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1, componentsUpdated: 0, relationshipsCreated: 1
      })

      await service.processSBOM({
        sbom: sbomWithComponentPurlOnly,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components[0].bomRef).toBe('pkg:npm/lodash@4.17.21')
      expect(persistCall.componentUsage.get('pkg:npm/lodash@4.17.21')).toMatchObject({ isDirect: true })
    })

    it('should exclude a CycloneDX root package component while using it to resolve direct deps', async () => {
      const sbomWithRootPackageComponent = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'AzureMap',
            version: '1.0.0',
            'bom-ref': 'pkg:application/AzureMap@1.0.0',
          }
        },
        components: [
          {
            type: 'library',
            name: 'AzureMap',
            purl: 'pkg:npm/AzureMap',
            'bom-ref': 'pkg:npm/AzureMap',
          },
          {
            type: 'library',
            name: 'theme-default',
            version: '1.0.0',
            purl: 'pkg:npm/@slidev/theme-default@1.0.0',
            'bom-ref': 'pkg:npm/@slidev/theme-default@1.0.0',
          },
          {
            type: 'library',
            name: 'cli',
            version: '52.0.0',
            purl: 'pkg:npm/@slidev/cli@52.0.0',
            'bom-ref': 'pkg:npm/@slidev/cli@52.0.0',
          },
        ],
        dependencies: [
          {
            ref: 'pkg:npm/AzureMap',
            dependsOn: [
              'pkg:npm/@slidev/theme-default@1.0.0',
              'pkg:npm/@slidev/cli@52.0.0',
            ]
          },
          { ref: 'pkg:npm/@slidev/theme-default@1.0.0', dependsOn: [] },
          { ref: 'pkg:npm/@slidev/cli@52.0.0', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 2, componentsUpdated: 0, relationshipsCreated: 2
      })

      await service.processSBOM({
        sbom: sbomWithRootPackageComponent,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.components.map(component => component.name)).not.toContain('AzureMap')
      expect(persistCall.components.map(component => component.name).toSorted()).toEqual(['cli', 'theme-default'])
      expect(persistCall.componentUsage.get('pkg:npm/@slidev/theme-default@1.0.0')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/@slidev/cli@52.0.0')).toMatchObject({ isDirect: true })
    })

    it('should infer direct dependencies from the component graph when no root entry matches', async () => {
      const sbomWithRootlessGraph = {
        ...validCycloneDxSbom,
        metadata: {
          component: {
            type: 'application',
            name: 'my-app',
            version: '1.0.0',
            'bom-ref': 'pkg:application/my-app@1.0.0',
          }
        },
        components: [
          {
            type: 'library',
            name: 'direct-lib',
            version: '1.0.0',
            purl: 'pkg:npm/direct-lib@1.0.0',
            'bom-ref': 'pkg:npm/direct-lib@1.0.0',
          },
          {
            type: 'library',
            name: 'transitive-lib',
            version: '1.0.0',
            purl: 'pkg:npm/transitive-lib@1.0.0',
            'bom-ref': 'pkg:npm/transitive-lib@1.0.0',
          },
          {
            type: 'library',
            name: 'isolated-lib',
            version: '1.0.0',
            purl: 'pkg:npm/isolated-lib@1.0.0',
            'bom-ref': 'pkg:npm/isolated-lib@1.0.0',
          }
        ],
        dependencies: [
          { ref: 'pkg:npm/direct-lib@1.0.0', dependsOn: ['pkg:npm/transitive-lib@1.0.0'] },
          { ref: 'pkg:npm/transitive-lib@1.0.0', dependsOn: [] },
        ]
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 3, componentsUpdated: 0, relationshipsCreated: 3
      })

      await service.processSBOM({
        sbom: sbomWithRootlessGraph,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]
      expect(persistCall.componentUsage.get('pkg:npm/direct-lib@1.0.0')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/isolated-lib@1.0.0')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/transitive-lib@1.0.0')).toMatchObject({ isDirect: false })
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

    it('should mark direct deps correctly when composer root uses vendor/name purl but projectName is bare repo name', async () => {
      // Regression test for: cdxgen generates metadata.component.name = "karla" (GitHub repo name)
      // but composer.json sets "name": "localgod/karla", so the dependency graph entry uses
      // "pkg:composer/localgod/karla@1.0.0" as the ref.  The name lookup must match the bare
      // root name "karla" against the last segment of "localgod/karla".
      const composerCdxSbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        metadata: {
          component: {
            type: 'application',
            name: 'karla',
            version: '1.0.0',
            'bom-ref': 'pkg:application/karla@1.0.0',
            purl: 'pkg:application/karla@1.0.0',
          }
        },
        components: [
          {
            type: 'library',
            name: 'phpunit',
            version: '10.5.60',
            'bom-ref': 'pkg:composer/phpunit/phpunit@10.5.60',
            purl: 'pkg:composer/phpunit/phpunit@10.5.60',
            scope: 'required',
          },
          {
            type: 'library',
            name: 'console',
            version: '6.0.0',
            'bom-ref': 'pkg:composer/symfony/console@6.0.0',
            purl: 'pkg:composer/symfony/console@6.0.0',
            scope: 'required',
          },
          {
            type: 'library',
            name: 'php-timer',
            version: '6.0.0',
            'bom-ref': 'pkg:composer/phpunit/php-timer@6.0.0',
            purl: 'pkg:composer/phpunit/php-timer@6.0.0',
            scope: 'required',
          },
          // The composer root itself — should be excluded, not persisted as a component
          {
            type: 'library',
            name: 'karla',
            version: '1.0.0',
            'bom-ref': 'pkg:composer/localgod/karla@1.0.0',
            purl: 'pkg:composer/localgod/karla@1.0.0',
          },
        ],
        dependencies: [
          // Application root — empty dependsOn (cdxgen often leaves this empty)
          { ref: 'pkg:application/karla@1.0.0', dependsOn: [] },
          // Composer root — carries the actual direct deps
          { ref: 'pkg:composer/localgod/karla@1.0.0', dependsOn: ['pkg:composer/phpunit/phpunit@10.5.60', 'pkg:composer/symfony/console@6.0.0'] },
          { ref: 'pkg:composer/phpunit/phpunit@10.5.60', dependsOn: ['pkg:composer/phpunit/php-timer@6.0.0'] },
          { ref: 'pkg:composer/symfony/console@6.0.0', dependsOn: [] },
          { ref: 'pkg:composer/phpunit/php-timer@6.0.0', dependsOn: [] },
        ],
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 3, componentsUpdated: 0, relationshipsCreated: 3
      })

      await service.processSBOM({
        sbom: composerCdxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1',
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]

      // The composer root (localgod/karla) must not appear as a dependency component
      expect(persistCall.components.some(c => c.purl === 'pkg:composer/localgod/karla@1.0.0')).toBe(false)

      // Direct composer deps must be marked isDirect: true
      expect(persistCall.componentUsage.get('pkg:composer/phpunit/phpunit@10.5.60')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:composer/symfony/console@6.0.0')).toMatchObject({ isDirect: true })

      // Transitive dep (php-timer is only required by phpunit)
      expect(persistCall.componentUsage.get('pkg:composer/phpunit/php-timer@6.0.0')).toMatchObject({ isDirect: false })
    })

    it('should mark direct deps from every ecosystem root when a repo has multiple manifests (e.g. composer.json + package.json)', async () => {
      // Regression test for: the "karla" repo has both composer.json ("localgod/karla")
      // for the PHP library and package.json ("karla") for its npm-based docs site.
      // cdxgen emits a dependency-graph entry for each. Picking only the entry with the
      // most dependsOn (the old behavior) silently dropped the other ecosystem's direct
      // deps entirely — resolveRootDirectDeps must merge across ecosystems.
      const multiEcosystemSbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        metadata: {
          component: {
            type: 'application',
            name: 'karla',
            version: '1.0.0',
            'bom-ref': 'pkg:application/karla@1.0.0',
          }
        },
        components: [
          { type: 'library', name: 'phpunit', version: '10.5.60', 'bom-ref': 'pkg:composer/phpunit/phpunit@10.5.60', purl: 'pkg:composer/phpunit/phpunit@10.5.60' },
          { type: 'library', name: 'vuepress', version: '2.0.0', 'bom-ref': 'pkg:npm/vuepress@2.0.0', purl: 'pkg:npm/vuepress@2.0.0' },
        ],
        dependencies: [
          { ref: 'pkg:application/karla@1.0.0', dependsOn: [] },
          // Composer root — 1 direct dep
          { ref: 'pkg:composer/localgod/karla@1.0.0', dependsOn: ['pkg:composer/phpunit/phpunit@10.5.60'] },
          // npm root — has more dependsOn entries than the composer root
          { ref: 'pkg:npm/karla@1.0.0', dependsOn: ['pkg:npm/vuepress@2.0.0'] },
          { ref: 'pkg:composer/phpunit/phpunit@10.5.60', dependsOn: [] },
          { ref: 'pkg:npm/vuepress@2.0.0', dependsOn: [] },
        ],
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 2, componentsUpdated: 0, relationshipsCreated: 2
      })

      await service.processSBOM({
        sbom: multiEcosystemSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1',
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]

      expect(persistCall.componentUsage.get('pkg:composer/phpunit/phpunit@10.5.60')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:npm/vuepress@2.0.0')).toMatchObject({ isDirect: true })
    })

    it('should mark GitHub Actions components as direct even though they have no root manifest', async () => {
      // Regression test for: the dependency graph section on a system's page couldn't
      // expand the "github" group node. cdxgen has no root-manifest concept for GitHub
      // Actions — a workflow file references each action directly, with no dependsOn
      // tree — so resolveRootDirectDeps never finds a "github" root and these components
      // fell through to the generic isDirect: false default. Every "github" ecosystem
      // component is a direct usage by definition.
      const githubActionsSbom = {
        ...validCycloneDxSbom,
        components: [
          ...validCycloneDxSbom.components,
          {
            type: 'application',
            name: 'actions/checkout',
            version: 'v4',
            purl: 'pkg:github/actions/checkout@v4',
            'bom-ref': 'pkg:github/actions/checkout@v4',
          },
          {
            type: 'application',
            name: 'actions/setup-node',
            version: 'v4',
            purl: 'pkg:github/actions/setup-node@v4',
            'bom-ref': 'pkg:github/actions/setup-node@v4',
          },
        ],
      }

      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 3, componentsUpdated: 0, relationshipsCreated: 3
      })

      await service.processSBOM({
        sbom: githubActionsSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1',
      })

      const persistCall = vi.mocked(SBOMRepository.prototype.persistSBOM).mock.calls[0][0]

      expect(persistCall.componentUsage.get('pkg:github/actions/checkout@v4')).toMatchObject({ isDirect: true })
      expect(persistCall.componentUsage.get('pkg:github/actions/setup-node@v4')).toMatchObject({ isDirect: true })
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

    it('should audit newly-added components individually and pass counts to the summary audit log', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1,
        addedComponents: [{ name: 'lodash', version: '4.17.21', purl: 'pkg:npm/lodash@4.17.21' }]
      })
      vi.mocked(SBOMRepository.prototype.createAuditLog).mockResolvedValue()
      vi.mocked(SBOMRepository.prototype.createComponentAddedAuditLogs).mockResolvedValue()

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1'
      })

      expect(SBOMRepository.prototype.createAuditLog).toHaveBeenCalledWith({
        systemName: 'test-system',
        userId: 'user-1',
        realUserId: null,
        format: 'cyclonedx',
        componentsAdded: 1,
        componentsUpdated: 0,
        correlationId: null
      })
      expect(SBOMRepository.prototype.createComponentAddedAuditLogs).toHaveBeenCalledWith({
        systemName: 'test-system',
        userId: 'user-1',
        realUserId: null,
        components: [{ name: 'lodash', version: '4.17.21', purl: 'pkg:npm/lodash@4.17.21' }],
        correlationId: null
      })
    })

    it('should thread correlationId through to the audit logs and the health-refresh enqueue', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1,
        addedComponents: [{ name: 'lodash', version: '4.17.21', purl: 'pkg:npm/lodash@4.17.21' }]
      })
      vi.mocked(SBOMRepository.prototype.createAuditLog).mockResolvedValue()
      vi.mocked(SBOMRepository.prototype.createComponentAddedAuditLogs).mockResolvedValue()
      const enqueueSpy = vi.spyOn(HealthRefreshService.prototype, 'enqueueForSystem').mockResolvedValue('job-1')

      await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx',
        userId: 'user-1',
        correlationId: 'corr-1'
      })

      expect(SBOMRepository.prototype.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'corr-1' })
      )
      expect(SBOMRepository.prototype.createComponentAddedAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'corr-1' })
      )
      expect(enqueueSpy).toHaveBeenCalledWith('test-system', 'corr-1')
    })

    it('should not include addedComponents in the returned result', async () => {
      vi.mocked(SBOMRepository.prototype.persistSBOM).mockResolvedValue({
        componentsAdded: 1,
        componentsUpdated: 0,
        relationshipsCreated: 1,
        addedComponents: [{ name: 'lodash', version: '4.17.21', purl: 'pkg:npm/lodash@4.17.21' }]
      })

      const result = await service.processSBOM({
        sbom: validCycloneDxSbom,
        repositoryUrl: 'https://github.com/org/repo',
        format: 'cyclonedx'
      })

      expect(result).not.toHaveProperty('addedComponents')
    })
  })
})
