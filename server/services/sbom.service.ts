import { SystemRepository } from '../repositories/system.repository'
import { SBOMRepository } from '../repositories/sbom.repository'
import { SourceRepositoryRepository } from '../repositories/source-repository.repository'
import { normalizeRepoUrl } from '../utils/repository'
import type {
  ProcessSBOMInput,
  ProcessSBOMResult,
  ExtractedComponent,
  ComponentHash,
  ComponentLicense,
  ExternalReference
} from '../types/sbom'

/**
 * Service for SBOM processing and persistence
 * 
 * Handles extraction of components from CycloneDX and SPDX formats
 * and persists them to the Neo4j database.
 */
export class SBOMService {
  private systemRepo: SystemRepository
  private sbomRepo: SBOMRepository
  private sourceRepoRepo: SourceRepositoryRepository

  constructor() {
    this.systemRepo = new SystemRepository()
    this.sbomRepo = new SBOMRepository()
    this.sourceRepoRepo = new SourceRepositoryRepository()
  }

  /**
   * Process and persist an SBOM
   * 
   * Business rules:
   * - Repository must be registered first (strict enforcement)
   * - Repository must be linked to a system
   * - Components are deduplicated by purl (or name+version)
   * - Existing components are updated with new metadata
   * - System-Component relationships are created/updated
   * - Repository lastSbomScanAt timestamp is updated
   * 
   * @param input - SBOM processing input
   * @returns Processing result with counts
   * @throws Error if repository not found or processing fails
   */
  async processSBOM(input: ProcessSBOMInput): Promise<ProcessSBOMResult> {
    // 1. Normalize repository URL
    const normalizedUrl = normalizeRepoUrl(input.repositoryUrl)
    
    // 2. Find repository (STRICT - must be registered first)
    const repository = await this.sourceRepoRepo.findByUrl(normalizedUrl)
    
    if (!repository) {
      const error = new Error(
        `Repository not registered: ${normalizedUrl}. ` +
        `Please register it first using POST /api/systems/{systemName}/repositories`
      ) as Error & { statusCode: number; hint: string }
      error.statusCode = 404
      error.hint = 'POST /api/systems/{systemName}/repositories'
      throw error
    }
    
    // 3. Find system by repository URL (verify linkage)
    const system = await this.findSystemByRepository(normalizedUrl)
    
    if (!system) {
      const error = new Error(
        `Repository ${normalizedUrl} is not linked to any system. ` +
        `Please contact your administrator.`
      ) as Error & { statusCode: number }
      error.statusCode = 409
      throw error
    }
    
    // 4. Extract components from SBOM
    const components = this.extractComponents(input.sbom as Record<string, unknown>, input.format)
    
    // 5. Persist to database
    const result = await this.sbomRepo.persistSBOM({
      systemName: system.name,
      repositoryUrl: normalizedUrl,
      components,
      format: input.format,
      timestamp: new Date()
    })
    
    // 6. Update repository last scan timestamp
    await this.sourceRepoRepo.updateLastScan(normalizedUrl)
    
    // 7. Audit log for SBOM import
    await this.sbomRepo.createAuditLog({
      systemName: system.name,
      userId: input.userId,
      format: input.format,
      componentsAdded: result.componentsAdded,
      componentsUpdated: result.componentsUpdated
    })
    
    return {
      systemName: system.name,
      repositoryUrl: normalizedUrl,
      ...result
    }
  }

  /**
   * Find system by repository URL
   * 
   * Searches for a system that has a HAS_SOURCE_IN relationship
   * to a repository with the given URL.
   */
  private async findSystemByRepository(url: string): Promise<{ name: string } | null> {
    return await this.systemRepo.findByRepositoryUrl(url)
  }

  /**
   * Extract components from SBOM based on format
   */
  private extractComponents(sbom: Record<string, unknown>, format: 'cyclonedx' | 'spdx'): ExtractedComponent[] {
    if (format === 'cyclonedx') {
      return this.extractCycloneDXComponents(sbom)
    } else {
      return this.extractSPDXComponents(sbom)
    }
  }

  /**
   * Extract components from CycloneDX SBOM
   */
  private extractCycloneDXComponents(sbom: Record<string, unknown>): ExtractedComponent[] {
    const components: ExtractedComponent[] = []
    
    // Extract main component from metadata
    const metadata = sbom.metadata as Record<string, unknown> | undefined
    if (metadata?.component) {
      components.push(this.mapCycloneDXComponent(metadata.component as Record<string, unknown>))
    }
    
    // Extract components array (with nested components)
    const componentsArray = sbom.components as unknown[] | undefined
    if (componentsArray && Array.isArray(componentsArray)) {
      for (const comp of componentsArray) {
        const component = comp as Record<string, unknown>
        components.push(this.mapCycloneDXComponent(component))
        
        // Recursively extract nested components
        const nestedComponents = component.components as unknown[] | undefined
        if (nestedComponents && Array.isArray(nestedComponents)) {
          components.push(...this.extractNestedComponents(nestedComponents))
        }
      }
    }
    
    return components
  }

  /**
   * Recursively extract nested CycloneDX components
   */
  private extractNestedComponents(components: unknown[]): ExtractedComponent[] {
    const extracted: ExtractedComponent[] = []
    
    for (const comp of components) {
      const component = comp as Record<string, unknown>
      extracted.push(this.mapCycloneDXComponent(component))
      
      if (component.components && Array.isArray(component.components)) {
        extracted.push(...this.extractNestedComponents(component.components))
      }
    }
    
    return extracted
  }

  /**
   * Extract components from SPDX SBOM
   */
  private extractSPDXComponents(sbom: Record<string, unknown>): ExtractedComponent[] {
    const packages = sbom.packages as unknown[] | undefined
    if (!packages || !Array.isArray(packages)) {
      return []
    }
    return packages.map((pkg) => this.mapSPDXPackage(pkg as Record<string, unknown>))
  }

  /**
   * Map CycloneDX component to ExtractedComponent
   */
  private mapCycloneDXComponent(comp: Record<string, unknown>): ExtractedComponent {
    const supplier = comp.supplier as Record<string, unknown> | undefined
    return {
      name: comp.name as string,
      version: (comp.version as string) || null,
      packageManager: this.extractPackageManager(comp.purl as string | null),
      purl: (comp.purl as string) || null,
      cpe: (comp.cpe as string) || null,
      bomRef: (comp['bom-ref'] as string) || null,
      type: (comp.type as string) || null,
      group: (comp.group as string) || null,
      scope: (comp.scope as string) || null,
      hashes: this.extractCycloneDXHashes((comp.hashes as unknown[]) || []),
      licenses: this.extractCycloneDXLicenses((comp.licenses as unknown[]) || []),
      copyright: (comp.copyright as string) || null,
      supplier: (supplier?.name as string) || null,
      author: (comp.author as string) || null,
      publisher: (comp.publisher as string) || null,
      homepage: (comp.homepage as string) || null,
      description: (comp.description as string) || null,
      externalReferences: this.extractCycloneDXReferences((comp.externalReferences as unknown[]) || [])
    }
  }

  /**
   * Map SPDX package to ExtractedComponent
   */
  private mapSPDXPackage(pkg: Record<string, unknown>): ExtractedComponent {
    const purl = this.extractPurlFromExternalRefs((pkg.externalRefs as unknown[]) || [])
    
    return {
      name: pkg.name as string,
      version: (pkg.versionInfo as string) || null,
      packageManager: this.extractPackageManager(purl),
      purl: purl,
      cpe: this.extractCpeFromExternalRefs((pkg.externalRefs as unknown[]) || []),
      bomRef: pkg.SPDXID as string,
      type: this.mapSPDXPurpose(pkg.primaryPackagePurpose as string | undefined),
      group: this.extractGroupFromPurl(purl),
      scope: null,
      hashes: this.extractSPDXHashes((pkg.checksums as unknown[]) || []),
      licenses: this.extractSPDXLicenses(pkg),
      copyright: (pkg.copyrightText as string) || null,
      supplier: this.extractEntityName(pkg.supplier as string | undefined),
      author: this.extractEntityName(pkg.originator as string | undefined),
      publisher: null,
      homepage: (pkg.homepage as string) || null,
      description: (pkg.description as string) || null,
      externalReferences: this.extractSPDXReferences((pkg.externalRefs as unknown[]) || [])
    }
  }

  /**
   * Extract package manager from purl
   */
  private extractPackageManager(purl: string | null): string | null {
    if (!purl) return null
    const match = purl.match(/^pkg:([^/]+)\//)
    return match?.[1] ?? null
  }

  /**
   * Extract group/namespace from purl
   */
  private extractGroupFromPurl(purl: string | null): string | null {
    if (!purl) return null
    // Extract namespace from purl (e.g., pkg:npm/@scope/package -> @scope)
    const match = purl.match(/^pkg:[^/]+\/([^/]+)\//)
    return match?.[1] ?? null
  }

  /**
   * Extract purl from SPDX external references
   */
  private extractPurlFromExternalRefs(refs: unknown[]): string | null {
    if (!refs) return null
    const purlRef = refs.find(r => {
      const ref = r as Record<string, unknown>
      return ref.referenceType === 'purl'
    }) as Record<string, unknown> | undefined
    return (purlRef?.referenceLocator as string) || null
  }

  /**
   * Extract CPE from SPDX external references
   */
  private extractCpeFromExternalRefs(refs: unknown[]): string | null {
    if (!refs) return null
    const cpeRef = refs.find(r => {
      const ref = r as Record<string, unknown>
      return ref.referenceType === 'cpe23Type' || ref.referenceType === 'cpe22Type'
    }) as Record<string, unknown> | undefined
    return (cpeRef?.referenceLocator as string) || null
  }

  /**
   * Extract CycloneDX hashes
   */
  private extractCycloneDXHashes(hashes: unknown[]): ComponentHash[] {
    return hashes.map(h => {
      const hash = h as Record<string, unknown>
      return {
        algorithm: hash.alg as string,
        value: hash.content as string
      }
    })
  }

  /**
   * Extract SPDX checksums
   */
  private extractSPDXHashes(checksums: unknown[]): ComponentHash[] {
    return checksums.map(c => {
      const checksum = c as Record<string, unknown>
      return {
        algorithm: checksum.algorithm as string,
        value: checksum.checksumValue as string
      }
    })
  }

  /**
   * Extract CycloneDX licenses
   */
  private extractCycloneDXLicenses(licenses: unknown[]): ComponentLicense[] {
    return licenses.flatMap(l => {
      const license = l as Record<string, unknown>
      if (license.expression) {
        return [{ id: license.expression as string, name: null, url: null, text: null }]
      } else if (license.license) {
        const lic = license.license as Record<string, unknown>
        return [{
          id: (lic.id as string) || null,
          name: (lic.name as string) || null,
          url: (lic.url as string) || null,
          text: (lic.text as string) || null
        }]
      }
      return []
    })
  }

  /**
   * Extract SPDX licenses
   */
  private extractSPDXLicenses(pkg: Record<string, unknown>): ComponentLicense[] {
    const licenses: ComponentLicense[] = []
    
    const licenseConcluded = pkg.licenseConcluded as string | undefined
    if (licenseConcluded && licenseConcluded !== 'NOASSERTION') {
      licenses.push({ 
        id: licenseConcluded, 
        name: null, 
        url: null, 
        text: null 
      })
    }
    
    const licenseDeclared = pkg.licenseDeclared as string | undefined
    if (licenseDeclared && 
        licenseDeclared !== 'NOASSERTION' && 
        licenseDeclared !== licenseConcluded) {
      licenses.push({ 
        id: licenseDeclared, 
        name: null, 
        url: null, 
        text: null 
      })
    }
    
    return licenses
  }

  /**
   * Extract CycloneDX external references
   */
  private extractCycloneDXReferences(refs: unknown[]): ExternalReference[] {
    return refs.map(r => {
      const ref = r as Record<string, unknown>
      return {
        type: ref.type as string,
        url: ref.url as string
      }
    })
  }

  /**
   * Extract SPDX external references
   */
  private extractSPDXReferences(refs: unknown[]): ExternalReference[] {
    return refs
      .filter(r => {
        const ref = r as Record<string, unknown>
        return ref.referenceType !== 'purl' && ref.referenceType !== 'cpe23Type'
      })
      .map(r => {
        const ref = r as Record<string, unknown>
        return {
          type: ref.referenceType as string,
          url: ref.referenceLocator as string
        }
      })
  }

  /**
   * Map SPDX primary purpose to component type
   */
  private mapSPDXPurpose(purpose: string | undefined): string | null {
    if (!purpose) return null
    
    const mapping: Record<string, string> = {
      'APPLICATION': 'application',
      'FRAMEWORK': 'framework',
      'LIBRARY': 'library',
      'CONTAINER': 'container',
      'OPERATING-SYSTEM': 'operating-system',
      'DEVICE': 'device',
      'FIRMWARE': 'firmware',
      'SOURCE': 'source',
      'ARCHIVE': 'archive',
      'FILE': 'file',
      'INSTALL': 'install',
      'OTHER': 'other'
    }
    
    return mapping[purpose] || purpose.toLowerCase()
  }

  /**
   * Extract entity name from SPDX supplier/originator field
   * Format: "Person: Name" or "Organization: Name"
   */
  private extractEntityName(entity: string | undefined): string | null {
    if (!entity) return null
    
    const match = entity.match(/^(?:Person|Organization):\s*(.+)$/)
    return match?.[1]?.trim() ?? entity
  }
}
