import { SystemRepository } from '../repositories/system.repository'
import { SBOMRepository } from '../repositories/sbom.repository'
import { SourceRepositoryRepository } from '../repositories/source-repository.repository'
import { normalizeRepoUrl } from '../utils/repository'
import { parseLicenseExpression } from '../utils/license-expression'
import { logger } from '../utils/logger'
import { HealthRefreshService } from './health-refresh.service'
import type {
  ProcessSBOMInput,
  ProcessSBOMResult,
  ExtractedComponent,
  ComponentDependency,
  ComponentHash,
  ComponentLicense,
  ExternalReference,
  ScopedEdge,
  ComponentUsage,
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

// SPDX relationship types where the direction is inverted relative to the dependency graph:
// "A DEV_DEPENDENCY_OF B" means B depends on A, so the edge in our graph is B→A.
const SPDX_INVERSE_RELATIONSHIP_TYPES = new Set([
  'DEV_DEPENDENCY_OF',
  'OPTIONAL_DEPENDENCY_OF',
  'PROVIDED_DEPENDENCY_OF',
  'RUNTIME_DEPENDENCY_OF',
  'TEST_DEPENDENCY_OF',
])

// Maps SPDX relationship types to the scope value stored on the USES edge.
// Relationship types not present here (e.g. DYNAMIC_LINK, STATIC_LINK) yield null.
const SPDX_SCOPE_MAP: Record<string, string> = {
  DEV_DEPENDENCY_OF: 'dev',
  OPTIONAL_DEPENDENCY_OF: 'optional',
  PROVIDED_DEPENDENCY_OF: 'provided',
  RUNTIME_DEPENDENCY_OF: 'runtime',
  TEST_DEPENDENCY_OF: 'dev',   // test deps are treated as dev for scope propagation
  DEPENDS_ON: 'required',
}

// Scope priority for BFS propagation: when a component is reachable via
// multiple paths with different scopes, the highest-priority scope wins.
// runtime/required > optional > dev > null
const SCOPE_PRIORITY: Record<string, number> = {
  runtime: 3,
  required: 3,
  optional: 2,
  dev: 1,
}

// Ecosystems that have no root-manifest concept for cdxgen to model a
// dependency tree from — every component is referenced directly (e.g. a
// GitHub Actions workflow file lists each action it uses with no nesting).
// Components in these ecosystems are always direct usages.
const NO_ROOT_MANIFEST_ECOSYSTEMS = new Set(['github'])

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
  private healthRefreshService: HealthRefreshService

  constructor() {
    this.systemRepo = new SystemRepository()
    this.sbomRepo = new SBOMRepository()
    this.sourceRepoRepo = new SourceRepositoryRepository()
    this.healthRefreshService = new HealthRefreshService()
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
    const startedAt = Date.now()

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
    const extractionStartedAt = Date.now()
    const sbomData = input.sbom as Record<string, unknown>
    const { bomRef: rootBomRef, name: rootName } = this.extractRootBomRef(sbomData, input.format)
    const components = this.extractComponents(sbomData, input.format, rootBomRef, rootName)

    // For SPDX, extract scoped edges (carry per-edge scope from relationship type).
    // For CycloneDX, extract plain dependency edges (scope comes from component field).
    const scopedEdges = input.format === 'spdx'
      ? this.extractSPDXScopedEdges(sbomData)
      : null

    // Build plain ComponentDependency[] for DEPENDS_ON edge persistence (unchanged).
    const dependencies = input.format === 'cyclonedx'
      ? this.extractCycloneDXDependencies(sbomData)
      : this.scopedEdgesToDependencies(scopedEdges!)

    // BFS scope propagation: compute {scope, isDirect} for every component.
    const componentUsage = this.propagateScope(
      rootBomRef,
      rootName,
      components,
      dependencies,
      input.format === 'spdx' ? scopedEdges! : null,
    )
    const extractionDurationMs = Date.now() - extractionStartedAt

    // 5. Persist to database
    const persistStartedAt = Date.now()
    const { addedComponents, ...result } = await this.sbomRepo.persistSBOM({
      systemName: system.name,
      repositoryUrl: normalizedUrl,
      components,
      dependencies,
      componentUsage,
      format: input.format,
      timestamp: new Date()
    })
    const persistDurationMs = Date.now() - persistStartedAt

    // 6. Upsert (Team)-[:USES]->(Technology) edges so compliance violation
    //    queries have current data after every SBOM submission.
    await this.sbomRepo.upsertTeamUsesTechnology(system.name)

    // 7. Update repository last scan timestamp
    await this.sourceRepoRepo.updateLastScan(normalizedUrl)

    // 8. Audit log for SBOM import: one summary entry, plus one entry per
    // newly-added component so "who introduced component X" can be answered
    // directly. Updated (already-tracked) components are intentionally not
    // audited individually — see create-component-added-audit-logs.cypher.
    await this.sbomRepo.createAuditLog({
      systemName: system.name,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
      format: input.format,
      componentsAdded: result.componentsAdded,
      componentsUpdated: result.componentsUpdated
    })
    await this.sbomRepo.createComponentAddedAuditLogs({
      systemName: system.name,
      userId: input.userId,
      realUserId: input.realUserId ?? null,
      components: addedComponents
    })

    // Queue health refresh after import persistence is complete. External
    // source lookups run later through HealthRefreshJob processing.
    try {
      await this.healthRefreshService.enqueueForSystem(system.name)
    } catch (error) {
      logger.error({ err: error, systemName: system.name }, 'Failed to enqueue post-import health refresh')
    }

    logger.info({
      systemName: system.name,
      repositoryUrl: normalizedUrl,
      format: input.format,
      componentsAdded: result.componentsAdded,
      componentsUpdated: result.componentsUpdated,
      relationshipsCreated: result.relationshipsCreated,
      extractionDurationMs,
      persistDurationMs,
      totalDurationMs: Date.now() - startedAt
    }, 'SBOM processed successfully')

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
  private extractComponents(
    sbom: Record<string, unknown>,
    format: 'cyclonedx' | 'spdx',
    rootBomRef: string | null,
    rootName: string | null,
  ): ExtractedComponent[] {
    if (format === 'cyclonedx') {
      return this.extractCycloneDXComponents(sbom, rootBomRef, rootName)
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
      const rootBomRef = (root?.['bom-ref'] as string)?.trim()
      const rootPurl = this.normalizePurl((root?.purl as string)?.trim() || null)
      return {
        bomRef: rootBomRef || rootPurl,
        name: (root?.name as string)?.trim() || null,
      }
    } else {
      // SPDX: the document node (SPDXRef-DOCUMENT) is not itself a package. Follow the
      // DESCRIBES relationship to find the root application package, which is the true
      // parent of all direct dependencies. Fall back to the raw SPDXID only if no
      // DESCRIBES edge is present (non-standard SBOM layout).
      const documentId = (sbom.SPDXID as string)?.trim() || null
      const relationships = sbom.relationships as unknown[] | undefined
      if (Array.isArray(relationships) && documentId) {
        for (const rel of relationships) {
          const r = rel as Record<string, unknown>
          if (
            r.relationshipType === 'DESCRIBES' &&
            (r.spdxElementId as string)?.trim() === documentId
          ) {
            const target = (r.relatedSpdxElement as string)?.trim()
            if (target) return { bomRef: target, name: null }
          }
        }
      }
      return { bomRef: documentId, name: null }
    }
  }

  /**
   * Resolve the bomRefs of the root component's direct dependencies.
   *
   * cdxgen sometimes uses different purl types for the root component in
   * `metadata.component` vs `dependencies[]`. For example, when run without
   * `node_modules`, the root bom-ref may be `pkg:application/name@ver` while
   * the dependencies entry uses `pkg:npm/name@ver`. The exact lookup finds the
   * `application`-typed entry which has an empty `dependsOn` list.
   *
   * Strategy:
   * 1. Exact match on `rootBomRef` — use it if `dependsOn` is non-empty.
   * 2. Fallback: find dependency entries whose purl name segment matches
   *    `rootName`, grouped by ecosystem (npm/composer/pypi/...). A repo can
   *    have multiple genuine root manifests across ecosystems (e.g. a PHP
   *    library's composer.json plus an npm package.json for its docs site) —
   *    each contributes its own direct deps. Within a single ecosystem,
   *    cdxgen sometimes emits the same manifest twice under different
   *    casing/purl-type; those are duplicates of one root, so we keep only
   *    the fullest entry per ecosystem.
   */
  private resolveRootDirectDeps(
    rootBomRef: string | null,
    rootName: string | null,
    dependencies: ComponentDependency[],
  ): string[] {
    if (rootBomRef) {
      const exact = dependencies.find(d => d.ref === rootBomRef)
      if (exact && exact.dependsOn.length > 0) return exact.dependsOn
    }

    if (!rootName) return []

    const normalizedRootName = rootName.toLowerCase()

    const candidates = dependencies.filter(d => {
      const n = this.nameFromPackageRef(d.ref)
      // Exact name match, or vendor-namespaced match (e.g. "localgod/karla" matches root "karla").
      return n !== null && (n === normalizedRootName || n.endsWith('/' + normalizedRootName)) && d.dependsOn.length > 0
    })

    const bestPerEcosystem = new Map<string, ComponentDependency>()
    for (const candidate of candidates) {
      const ecosystem = this.ecosystemFromPackageRef(candidate.ref)
      const current = bestPerEcosystem.get(ecosystem)
      if (!current || candidate.dependsOn.length > current.dependsOn.length) {
        bestPerEcosystem.set(ecosystem, candidate)
      }
    }

    return [...new Set([...bestPerEcosystem.values()].flatMap(c => c.dependsOn))]
  }

  private ecosystemFromPackageRef(ref: string): string {
    return ref.match(/^pkg:([^/]+)\//)?.[1]?.toLowerCase() ?? ''
  }

  private nameFromPackageRef(ref: string | null): string | null {
    if (!ref) return null

    const match = ref.match(/^pkg:[^/]+\/(.+)$/)
    if (!match?.[1]) return null

    const withoutQualifiers = match[1].split(/[?#]/, 1)[0]
    const versionSeparator = withoutQualifiers.lastIndexOf('@')
    const name = versionSeparator > 0
      ? withoutQualifiers.slice(0, versionSeparator)
      : withoutQualifiers

    try {
      return decodeURIComponent(name).toLowerCase()
    } catch {
      return name.toLowerCase()
    }
  }

  private isRootEquivalentComponent(
    component: ExtractedComponent,
    rootBomRef: string | null,
    rootName: string | null,
  ): boolean {
    if (rootBomRef && (component.bomRef === rootBomRef || component.purl === rootBomRef)) {
      return true
    }

    if (!rootName) return false

    const normalizedRootName = rootName.toLowerCase()
    if (component.name?.toLowerCase() === normalizedRootName) {
      return true
    }

    const bomRefName = this.nameFromPackageRef(component.bomRef)
    const purlName = this.nameFromPackageRef(component.purl)
    // Also match vendor-namespaced names (e.g. "localgod/karla" matches root "karla").
    return (bomRefName !== null && (bomRefName === normalizedRootName || bomRefName.endsWith('/' + normalizedRootName)))
      || (purlName !== null && (purlName === normalizedRootName || purlName.endsWith('/' + normalizedRootName)))
  }

  /**
   * Infer direct dependencies when an SBOM contains a dependency graph but no
   * usable root entry. In that shape, direct dependencies are the component
   * nodes that have no parent component within the same SBOM graph.
   */
  private inferDirectDepsFromComponentGraph(
    components: ExtractedComponent[],
    dependencies: ComponentDependency[],
  ): string[] {
    const componentRefs = new Set(
      components
        .map(component => component.bomRef)
        .filter((bomRef): bomRef is string => Boolean(bomRef))
    )

    if (componentRefs.size === 0) return []

    const childRefs = new Set<string>()
    let componentEdgeCount = 0

    for (const dependency of dependencies) {
      if (!componentRefs.has(dependency.ref)) continue

      for (const targetRef of dependency.dependsOn) {
        if (!componentRefs.has(targetRef) || targetRef === dependency.ref) continue
        childRefs.add(targetRef)
        componentEdgeCount++
      }
    }

    if (componentEdgeCount === 0) return []

    return [...componentRefs].filter(bomRef => !childRefs.has(bomRef))
  }

  /**
   * BFS scope propagation: compute {scope, isDirect} for every component.
   *
   * Algorithm:
   * 1. Identify direct deps of the root (via resolveRootDirectDeps).
   * 2. Assign each direct dep isDirect=true and its own scope.
   * 3. BFS from runtime/required directs → all reachable: isDirect=false, scope='runtime'
   * 4. BFS from optional directs → remaining: isDirect=false, scope='optional'
   * 5. BFS from dev directs → remaining: isDirect=false, scope='dev'
   * 6. Any component not reached: isDirect=false, scope=null
   *
   * When a component is reachable via multiple paths, the highest-priority
   * scope wins (runtime/required > optional > dev > null).
   *
   * For SPDX, scopedEdges carries per-edge scope so the BFS uses the edge
   * scope rather than the target component's own scope field.
   * For CycloneDX, scope comes from ExtractedComponent.scope.
   */
  private propagateScope(
    rootBomRef: string | null,
    rootName: string | null,
    components: ExtractedComponent[],
    dependencies: ComponentDependency[],
    scopedEdges: ScopedEdge[] | null,
  ): Map<string, ComponentUsage> {
    const usage = new Map<string, ComponentUsage>()

    // Index component scope by bomRef (CycloneDX path)
    const componentScopeByBomRef = new Map<string, string | null>()
    for (const comp of components) {
      if (comp.bomRef) {
        componentScopeByBomRef.set(comp.bomRef, comp.scope)
      }
    }

    // Build adjacency: bomRef → [{ to, scope }]
    // For SPDX: use per-edge scope from scopedEdges
    // For CycloneDX: use target component's scope field
    const adjacency = new Map<string, Array<{ to: string; scope: string | null }>>()

    if (scopedEdges) {
      for (const edge of scopedEdges) {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
        adjacency.get(edge.from)!.push({ to: edge.to, scope: edge.scope })
      }
    } else {
      for (const dep of dependencies) {
        const edges = dep.dependsOn.map(to => ({
          to,
          scope: componentScopeByBomRef.get(to) ?? null,
        }))
        adjacency.set(dep.ref, edges)
      }
    }

    // Resolve direct deps of the root. If the root is missing or unusable but
    // the SBOM still carries a component dependency graph, infer top-level
    // components as those with no parent component in that graph.
    let directBomRefs = this.resolveRootDirectDeps(rootBomRef, rootName, dependencies)
    if (directBomRefs.length === 0) {
      directBomRefs = this.inferDirectDepsFromComponentGraph(components, dependencies)
    }

    // Determine scope for each direct dep
    const directScopes = new Map<string, string | null>()
    for (const bomRef of directBomRefs) {
      const scope = scopedEdges
        ? (() => {
        // For SPDX: find the edge from root to this bomRef and use its scope
          const edge = scopedEdges.find(e =>
            (e.from === rootBomRef || (rootName && e.from.includes(rootName))) && e.to === bomRef
          )
          return edge?.scope ?? null
        })()
        : componentScopeByBomRef.get(bomRef) ?? null
      directScopes.set(bomRef, scope)
    }

    // Assign direct deps
    for (const [bomRef, scope] of directScopes) {
      usage.set(bomRef, { bomRef, scope, isDirect: true })
    }

    // BFS helper: propagate a given scope from a set of seed bomRefs
    const bfs = (seeds: string[], propagatedScope: string) => {
      const queue = [...seeds]
      while (queue.length > 0) {
        const current = queue.shift()!
        const edges = adjacency.get(current) ?? []
        for (const { to } of edges) {
          const existing = usage.get(to)
          const existingPriority = existing?.scope ? (SCOPE_PRIORITY[existing.scope] ?? 0) : -1
          const newPriority = SCOPE_PRIORITY[propagatedScope] ?? 0
          if (!existing || newPriority > existingPriority) {
            usage.set(to, { bomRef: to, scope: propagatedScope, isDirect: false })
            queue.push(to)
          }
        }
      }
    }

    // BFS in priority order: runtime/required first, then optional, then dev
    const runtimeSeeds = directBomRefs.filter(r => {
      const s = directScopes.get(r)
      return s === 'runtime' || s === 'required'
    })
    const optionalSeeds = directBomRefs.filter(r => directScopes.get(r) === 'optional')
    const devSeeds = directBomRefs.filter(r => {
      const s = directScopes.get(r)
      return s === 'dev' || s === 'test'
    })

    bfs(runtimeSeeds, 'runtime')
    bfs(optionalSeeds, 'optional')
    bfs(devSeeds, 'dev')

    // Any component with a bomRef not yet classified: scope=null, isDirect=false.
    // Exception: ecosystems with no root-manifest concept (e.g. GitHub Actions,
    // which a workflow file references directly with no dependsOn tree) are
    // always direct usages — there's no manifest for resolveRootDirectDeps to match.
    for (const comp of components) {
      if (comp.bomRef && !usage.has(comp.bomRef)) {
        const isDirect = NO_ROOT_MANIFEST_ECOSYSTEMS.has(this.ecosystemFromPackageRef(comp.bomRef))
        usage.set(comp.bomRef, { bomRef: comp.bomRef, scope: isDirect ? comp.scope ?? null : null, isDirect })
      }
    }

    return usage
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

  /**
   * Extract SPDX relationships as ScopedEdge[], preserving per-edge scope.
   *
   * Unlike the CycloneDX path, SPDX encodes scope in the relationship type
   * (DEV_DEPENDENCY_OF, RUNTIME_DEPENDENCY_OF, etc.) rather than on the
   * package object. Preserving the type here allows the BFS propagation pass
   * to use the correct scope for each edge.
   */
  private extractSPDXScopedEdges(sbom: Record<string, unknown>): ScopedEdge[] {
    const relationships = sbom.relationships as unknown[] | undefined
    if (!Array.isArray(relationships)) return []

    const edges: ScopedEdge[] = []
    for (const rel of relationships) {
      const r = rel as Record<string, unknown>
      const type = r.relationshipType as string | undefined
      if (!type || !SPDX_DEPENDENCY_TYPES.has(type)) continue
      const elementId = (r.spdxElementId as string)?.trim()
      const relatedElement = (r.relatedSpdxElement as string)?.trim()
      if (!elementId || !relatedElement) continue
      // Inverse types encode the child as spdxElementId and the parent as relatedSpdxElement
      // (e.g. "phpunit DEV_DEPENDENCY_OF karla" means karla→phpunit in our graph).
      const [from, to] = SPDX_INVERSE_RELATIONSHIP_TYPES.has(type)
        ? [relatedElement, elementId]
        : [elementId, relatedElement]
      edges.push({ from, to, scope: SPDX_SCOPE_MAP[type] ?? null })
    }
    return edges
  }

  /**
   * Convert ScopedEdge[] to ComponentDependency[] for DEPENDS_ON edge persistence.
   * Scope is discarded here — it lives on the USES edge, not DEPENDS_ON.
   */
  private scopedEdgesToDependencies(edges: ScopedEdge[]): ComponentDependency[] {
    const map = new Map<string, string[]>()
    for (const { from, to } of edges) {
      if (!map.has(from)) map.set(from, [])
      map.get(from)!.push(to)
    }
    return Array.from(map.entries()).map(([ref, dependsOn]) => ({ ref, dependsOn }))
  }

  /**
   * Extract components from CycloneDX SBOM.
   *
   * `metadata.component` is the subject of the SBOM (the scanned system
   * itself) and is intentionally excluded — it is not a dependency.
   */
  private extractCycloneDXComponents(
    sbom: Record<string, unknown>,
    rootBomRef: string | null,
    rootName: string | null,
  ): ExtractedComponent[] {
    const components: ExtractedComponent[] = []

    // Extract components array (with nested components)
    const componentsArray = sbom.components as unknown[] | undefined
    if (componentsArray && Array.isArray(componentsArray)) {
      for (const comp of componentsArray) {
        const component = comp as Record<string, unknown>
        const mapped = this.mapCycloneDXComponent(component)
        if (!this.isRootEquivalentComponent(mapped, rootBomRef, rootName)) {
          components.push(mapped)
        }
        
        // Recursively extract nested components
        const nestedComponents = component.components as unknown[] | undefined
        if (nestedComponents && Array.isArray(nestedComponents)) {
          components.push(...this.extractNestedComponents(nestedComponents, rootBomRef, rootName))
        }
      }
    }
    
    return components
  }

  /**
   * Recursively extract nested CycloneDX components
   */
  private extractNestedComponents(
    components: unknown[],
    rootBomRef: string | null,
    rootName: string | null,
  ): ExtractedComponent[] {
    const extracted: ExtractedComponent[] = []
    
    for (const comp of components) {
      const component = comp as Record<string, unknown>
      const mapped = this.mapCycloneDXComponent(component)
      if (!this.isRootEquivalentComponent(mapped, rootBomRef, rootName)) {
        extracted.push(mapped)
      }
      
      if (component.components && Array.isArray(component.components)) {
        extracted.push(...this.extractNestedComponents(component.components, rootBomRef, rootName))
      }
    }
    
    return extracted
  }

  /**
   * Extract components from SPDX SBOM.
   *
   * Builds a scope map from relationships before mapping packages so that
   * each package can receive the correct scope derived from its relationship type.
   * This scope is stored on ExtractedComponent.scope and later used by the
   * BFS propagation pass to set scope on the USES edge.
   */
  private extractSPDXComponents(sbom: Record<string, unknown>): ExtractedComponent[] {
    const packages = sbom.packages as unknown[] | undefined
    if (!packages || !Array.isArray(packages)) {
      return []
    }
    // Build SPDXID → scope from relationships so mapSPDXPackage can set scope.
    // A package may appear as the target of multiple relationship types; the
    // first recognised type wins (relationships are typically ordered root-first).
    const scopeMap = this.buildSPDXComponentScopeMap(sbom)
    return packages.map((pkg) => this.mapSPDXPackage(pkg as Record<string, unknown>, scopeMap))
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
      bomRef: (comp['bom-ref'] as string)?.trim() || purl,
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
   * Map SPDX package to ExtractedComponent.
   *
   * @param scopeMap - SPDXID → scope derived from relationship types. Packages
   *   not present in the map (e.g. the document root) receive scope: null.
   */
  private mapSPDXPackage(pkg: Record<string, unknown>, scopeMap: Map<string, string | null>): ExtractedComponent {
    const purl = this.normalizePurl(this.extractPurlFromExternalRefs((pkg.externalRefs as unknown[]) || []))
    const spdxId = pkg.SPDXID as string

    return {
      name: pkg.name as string,
      version: (pkg.versionInfo as string)?.trim() || null,
      packageManager: this.extractPackageManager(purl),
      purl: purl,
      cpe: this.extractCpeFromExternalRefs((pkg.externalRefs as unknown[]) || []),
      bomRef: spdxId,
      type: this.mapSPDXPurpose(pkg.primaryPackagePurpose as string | undefined),
      group: this.extractGroupFromPurl(purl),
      scope: scopeMap.get(spdxId) ?? null,
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
   * Build a SPDXID → scope map from SPDX relationships for use in mapSPDXPackage.
   *
   * SPDX encodes scope in the relationship type rather than on the package.
   * This method scans `relationships[]` and maps each target SPDXID to the
   * scope derived from the first recognised relationship type that points to it.
   * Relationship types not in SPDX_SCOPE_MAP yield null.
   */
  private buildSPDXComponentScopeMap(sbom: Record<string, unknown>): Map<string, string | null> {
    const map = new Map<string, string | null>()
    const relationships = sbom.relationships as unknown[] | undefined
    if (!Array.isArray(relationships)) return map

    for (const rel of relationships) {
      const r = rel as Record<string, unknown>
      const type = r.relationshipType as string | undefined
      if (!type || !SPDX_DEPENDENCY_TYPES.has(type)) continue
      const tgt = (r.relatedSpdxElement as string)?.trim()
      if (!tgt) continue
      // First relationship type wins; don't overwrite an already-resolved scope.
      if (!map.has(tgt)) {
        map.set(tgt, SPDX_SCOPE_MAP[type] ?? null)
      }
    }
    return map
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
