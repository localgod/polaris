import { SystemRepository } from '../repositories/system.repository'
import { SBOMRepository } from '../repositories/sbom.repository'
import { SourceRepositoryRepository } from '../repositories/source-repository.repository'
import { normalizeRepoUrl } from '../utils/repository'
import { parseLicenseExpression } from '../utils/license-expression'
import type {
  ProcessSBOMInput,
  ProcessSBOMResult,
  ExtractedComponent,
  ComponentDependency,
  ComponentHash,
  ComponentLicense,
  ExternalReference
} from '../types/sbom'

// SPDX relationship types that represent a dependency edge.
// Defined at module level to avoid re-allocation on every call.
const SPDX_DEPENDENCY_TYPES = new Set([
  'DEPENDS_ON',
  'DEV_DEPENDENCY_OF',
  'OPTIONAL_DEPENDENCY_OF',
  'PROVIDED_DEPENDENCY_OF',
  'RUNTIME_DEPENDENCY_OF',
  'TEST_DEPENDENCY_OF',
])

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
    
    // 4. Extract components and dependency relationships from SBOM
    const sbomData = input.sbom as Record<string, unknown>
    const components = this.extractComponents(sbomData, input.format)
    const dependencies = this.extractDependencies(sbomData, input.format)
    const { bomRef: rootBomRef, name: rootName } = this.extractRootBomRef(sbomData, input.format)
    // Resolve direct deps here so the repository doesn't need to re-scan dependencies.
    // Uses a fallback for SBOMs where the root bom-ref type differs between
    // metadata.component and the dependencies[] entry (e.g. cdxgen without node_modules).
    const directDeps = this.resolveDirectDeps(rootBomRef, rootName, dependencies)

    // 5. Persist to database
    const result = await this.sbomRepo.persistSBOM({
      systemName: system.name,
      repositoryUrl: normalizedUrl,
      components,
      dependencies,
      directDeps,
      format: input.format,
      timestamp: new Date()
    })
    
    // 6. Upsert (Team)-[:USES]->(Technology) edges so compliance violation
    //    queries have current data after every SBOM submission.
    await this.sbomRepo.upsertTeamUsesTechnology(system.name)

    // 7. Update repository last scan timestamp
    await this.sourceRepoRepo.updateLastScan(normalizedUrl)
    
    // 8. Audit log for SBOM import
    await this.sbomRepo.createAuditLog({
      systemName: system.name,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
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
   * Extract the bomRef and name of the root component (the scanned system itself).
   * CycloneDX: metadata.component['bom-ref'] and metadata.component.name
   * SPDX: the SPDXID of the document element (SPDXRef-DOCUMENT); name is null
   */
  private extractRootBomRef(sbom: Record<string, unknown>, format: 'cyclonedx' | 'spdx'): { bomRef: string | null; name: string | null } {
    if (format === 'cyclonedx') {
      const metadata = sbom.metadata as Record<string, unknown> | undefined
      const root = metadata?.component as Record<string, unknown> | undefined
      return {
        bomRef: (root?.['bom-ref'] as string)?.trim() || null,
        name: (root?.name as string)?.trim() || null,
      }
    } else {
      // SPDX: the document itself is the root; its SPDXID is typically SPDXRef-DOCUMENT
      return {
        bomRef: (sbom.SPDXID as string)?.trim() || null,
        name: null,
      }
    }
  }

  /**
   * Resolve the direct dependency bomRefs for the root component.
   *
   * cdxgen sometimes uses different purl types for the root component in
   * `metadata.component` vs `dependencies[]`. For example, when run without
   * `node_modules`, the root bom-ref may be `pkg:application/name@ver` while
   * the dependencies entry uses `pkg:npm/name@ver`. The exact lookup finds the
   * `application`-typed entry which has an empty `dependsOn` list.
   *
   * Strategy:
   * 1. Exact match on `rootBomRef` — use it if `dependsOn` is non-empty.
   * 2. Fallback: find the dependency entry whose purl name segment matches
   *    `rootName` and has the most `dependsOn` entries.
   */
  private resolveDirectDeps(
    rootBomRef: string | null,
    rootName: string | null,
    dependencies: ComponentDependency[]
  ): string[] {
    if (rootBomRef) {
      const exact = dependencies.find(d => d.ref === rootBomRef)
      if (exact && exact.dependsOn.length > 0) return exact.dependsOn
    }

    if (!rootName) return []

    // Extract the name segment from a purl: pkg:<type>/<name>@<version> → <name>
    const nameFromRef = (ref: string): string | null => {
      const m = ref.match(/^pkg:[^/]+\/([^@]+)@/)
      return m?.[1] ?? null
    }

    const candidates = dependencies
      .filter(d => nameFromRef(d.ref) === rootName && d.dependsOn.length > 0)
      .sort((a, b) => b.dependsOn.length - a.dependsOn.length)

    return candidates[0]?.dependsOn ?? []
  }

  /**
   * Extract component dependency relationships from a CycloneDX or SPDX SBOM.
   *
   * CycloneDX: reads the top-level `dependencies` array.
   * SPDX: reads the top-level `relationships` array, filtered to dependency types.
   *
   * Returns an empty array if the SBOM has no dependency section.
   */
  private extractDependencies(sbom: Record<string, unknown>, format: 'cyclonedx' | 'spdx'): ComponentDependency[] {
    if (format === 'cyclonedx') {
      return this.extractCycloneDXDependencies(sbom)
    } else {
      return this.extractSPDXDependencies(sbom)
    }
  }

  private extractCycloneDXDependencies(sbom: Record<string, unknown>): ComponentDependency[] {
    const depsArray = sbom.dependencies as unknown[] | undefined
    if (!Array.isArray(depsArray)) return []

    return (depsArray as Record<string, unknown>[]).flatMap(dep => {
      const ref = (dep.ref as string)?.trim()
      if (!ref) return []
      const dependsOn = dep.dependsOn as unknown[] | undefined
      return [{
        ref,
        dependsOn: Array.isArray(dependsOn)
          ? (dependsOn as string[]).map(r => r.trim()).filter(Boolean)
          : [],
      }]
    })
  }

  private extractSPDXDependencies(sbom: Record<string, unknown>): ComponentDependency[] {
    const relationships = sbom.relationships as unknown[] | undefined
    if (!Array.isArray(relationships)) return []

    // Group by spdxElementId → list of relatedSpdxElement
    const map = new Map<string, string[]>()
    for (const rel of relationships) {
      const r = rel as Record<string, unknown>
      if (!SPDX_DEPENDENCY_TYPES.has(r.relationshipType as string)) continue
      const src = (r.spdxElementId as string)?.trim()
      const tgt = (r.relatedSpdxElement as string)?.trim()
      if (!src || !tgt) continue
      if (!map.has(src)) map.set(src, [])
      map.get(src)!.push(tgt)
    }

    return Array.from(map.entries()).map(([ref, dependsOn]) => ({ ref, dependsOn }))
  }

  /**
   * Extract components from CycloneDX SBOM.
   *
   * `metadata.component` is the subject of the SBOM (the scanned system
   * itself) and is intentionally excluded — it is not a dependency.
   */
  private extractCycloneDXComponents(sbom: Record<string, unknown>): ExtractedComponent[] {
    const components: ExtractedComponent[] = []

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
    const purl = this.normalizePurl((comp.purl as string)?.trim() || null)
    return {
      name: comp.name as string,
      version: (comp.version as string)?.trim() || null,
      packageManager: this.extractPackageManager(purl),
      purl,
      cpe: (comp.cpe as string)?.trim() || null,
      bomRef: (comp['bom-ref'] as string)?.trim() || null,
      type: (comp.type as string)?.trim() || null,
      group: (comp.group as string)?.trim() || null,
      scope: (comp.scope as string)?.trim() || null,
      hashes: this.extractCycloneDXHashes((comp.hashes as unknown[]) || []),
      licenses: this.extractCycloneDXLicenses((comp.licenses as unknown[]) || []),
      copyright: (comp.copyright as string)?.trim() || null,
      supplier: (supplier?.name as string)?.trim() || null,
      author: (comp.author as string)?.trim() || null,
      publisher: (comp.publisher as string)?.trim() || null,
      homepage: (comp.homepage as string)?.trim() || null,
      description: (comp.description as string)?.trim() || null,
      externalReferences: this.extractCycloneDXReferences((comp.externalReferences as unknown[]) || [])
    }
  }

  /**
   * Map SPDX package to ExtractedComponent
   */
  private mapSPDXPackage(pkg: Record<string, unknown>): ExtractedComponent {
    const purl = this.normalizePurl(this.extractPurlFromExternalRefs((pkg.externalRefs as unknown[]) || []))
    
    return {
      name: pkg.name as string,
      version: (pkg.versionInfo as string)?.trim() || null,
      packageManager: this.extractPackageManager(purl),
      purl: purl,
      cpe: this.extractCpeFromExternalRefs((pkg.externalRefs as unknown[]) || []),
      bomRef: pkg.SPDXID as string,
      type: this.mapSPDXPurpose(pkg.primaryPackagePurpose as string | undefined),
      group: this.extractGroupFromPurl(purl),
      scope: null,
      hashes: this.extractSPDXHashes((pkg.checksums as unknown[]) || []),
      licenses: this.extractSPDXLicenses(pkg),
      copyright: (pkg.copyrightText as string)?.trim() || null,
      supplier: this.extractEntityName(pkg.supplier as string | undefined),
      author: this.extractEntityName(pkg.originator as string | undefined),
      publisher: null,
      homepage: (pkg.homepage as string)?.trim() || null,
      description: (pkg.description as string)?.trim() || null,
      externalReferences: this.extractSPDXReferences((pkg.externalRefs as unknown[]) || [])
    }
  }

  /**
   * Normalize a purl by decoding percent-encoded characters that the purl spec
   * does not require to be encoded. cdxgen encodes '@' as '%40' in the namespace
   * portion of npm purls (e.g. pkg:npm/%40scope/name), which diverges from the
   * spec and causes purl != bom-ref mismatches for scoped packages.
   */
  private normalizePurl(purl: string | null): string | null {
    if (!purl) return null
    return purl.replace(/%40/gi, '@')
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
    return (purlRef?.referenceLocator as string)?.trim() || null
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
    return (cpeRef?.referenceLocator as string)?.trim() || null
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
   * Extract CycloneDX licenses.
   * Compound SPDX expressions are decomposed into individual licenses.
   */
  private extractCycloneDXLicenses(licenses: unknown[]): ComponentLicense[] {
    return licenses.flatMap(l => {
      const license = l as Record<string, unknown>
      if (license.expression) {
        const expr = license.expression as string
        const parsed = parseLicenseExpression(expr)
        return parsed.map(p => ({
          id: p.id,
          name: null,
          url: null,
          text: null,
          expression: p.expression
        }))
      } else if (license.license) {
        const lic = license.license as Record<string, unknown>
        return [{
          id: (lic.id as string)?.trim() || null,
          name: (lic.name as string)?.trim() || null,
          url: (lic.url as string)?.trim() || null,
          text: (lic.text as string)?.trim() || null,
          expression: null
        }]
      }
      return []
    })
  }

  /**
   * Extract SPDX licenses.
   * Compound SPDX expressions are decomposed into individual licenses.
   */
  private extractSPDXLicenses(pkg: Record<string, unknown>): ComponentLicense[] {
    const licenses: ComponentLicense[] = []

    const licenseConcluded = pkg.licenseConcluded as string | undefined
    if (licenseConcluded && licenseConcluded !== 'NOASSERTION') {
      const parsed = parseLicenseExpression(licenseConcluded)
      licenses.push(...parsed.map(p => ({
        id: p.id,
        name: null,
        url: null,
        text: null,
        expression: p.expression
      })))
    }

    const licenseDeclared = pkg.licenseDeclared as string | undefined
    if (licenseDeclared &&
        licenseDeclared !== 'NOASSERTION' &&
        licenseDeclared !== licenseConcluded) {
      const parsed = parseLicenseExpression(licenseDeclared)
      licenses.push(...parsed.map(p => ({
        id: p.id,
        name: null,
        url: null,
        text: null,
        expression: p.expression
      })))
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
