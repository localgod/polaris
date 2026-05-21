import { BaseRepository } from './base.repository'
import type { PersistSBOMParams, PersistSBOMResult, ComponentDependency } from '../types/sbom'

/**
 * Repository for SBOM-related data access
 */
export class SBOMRepository extends BaseRepository {
  /**
   * Persist SBOM components and relationships
   * 
   * Uses MERGE to avoid duplicates and update existing components.
   * Creates System-[:USES]->Component relationships.
   * 
   * @param params - SBOM persistence parameters
   * @returns Persistence result with counts
   */
  // Batch size for phase 1 (scalar properties only — cheap)
  private static readonly BATCH_SIZE = 50
  // Batch size for phase 2 (hashes/licenses/refs — expensive due to delete+recreate)
  private static readonly RELATIONS_BATCH_SIZE = 10

  async persistSBOM(params: PersistSBOMParams): Promise<PersistSBOMResult> {
    const coreQuery = await loadQuery('sboms/persist-components-core.cypher')
    const relationsQuery = await loadQuery('sboms/persist-components-relations.cypher')
    const timestamp = params.timestamp.toISOString()

    // Scalar fields only — sent in phase 1 (large batches, cheap)
    const coreComponents = params.components.map((comp) => ({
      name: comp.name,
      version: comp.version,
      packageManager: comp.packageManager,
      purl: comp.purl,
      cpe: comp.cpe,
      bomRef: comp.bomRef,
      type: comp.type,
      group: comp.group,
      scope: comp.scope,
      copyright: comp.copyright,
      supplier: comp.supplier,
      author: comp.author,
      publisher: comp.publisher,
      homepage: comp.homepage,
      description: comp.description,
    }))

    // Relation fields — sent in phase 2 (small batches, expensive)
    const relComponents = params.components.map((comp) => ({
      purl: comp.purl,
      name: comp.name,
      version: comp.version,
      hashes: comp.hashes.map(h => ({ algorithm: h.algorithm, value: h.value })),
      licenses: comp.licenses.map(l => ({ id: l.id, name: l.name, url: l.url, text: l.text, expression: l.expression })),
      externalReferences: comp.externalReferences.map(r => ({ type: r.type, url: r.url })),
    }))

    let componentsAdded = 0
    let componentsUpdated = 0
    let relationshipsCreated = 0

    // Phase 1: MERGE components and USES edges — batch of 50
    for (let i = 0; i < coreComponents.length; i += SBOMRepository.BATCH_SIZE) {
      const batch = coreComponents.slice(i, i + SBOMRepository.BATCH_SIZE)
      const { records } = await this.executeQueryWithSession(coreQuery, {
        systemName: params.systemName,
        components: batch,
        timestamp,
      })
      if (records.length > 0) {
        componentsAdded += records[0]!.get('componentsAdded').toNumber()
        componentsUpdated += records[0]!.get('componentsUpdated').toNumber()
        relationshipsCreated += records[0]!.get('relationshipsCreated').toNumber()
      }
    }

    // Phase 2: Replace hashes, licenses, external refs — batch of 10
    for (let i = 0; i < relComponents.length; i += SBOMRepository.RELATIONS_BATCH_SIZE) {
      const batch = relComponents.slice(i, i + SBOMRepository.RELATIONS_BATCH_SIZE)
      await this.executeQueryWithSession(relationsQuery, {
        components: batch,
        timestamp,
      })
    }

    // Persist DEPENDS_ON edges between components
    if (params.dependencies.length > 0) {
      await this.persistDependencies(params.dependencies, params.timestamp)
    }

    // Persist (System)-[:DIRECT_DEP]->(Component) edges
    if (params.directDeps.length > 0) {
      await this.persistDirectDeps(params.systemName, params.directDeps, params.timestamp)
    }

    return { componentsAdded, componentsUpdated, relationshipsCreated }
  }

  /**
   * Create DEPENDS_ON edges between Component nodes.
   *
   * Matches components by bomRef. Refs that don't resolve to a known
   * Component node are silently skipped by the Cypher query.
   */
  private async persistDirectDeps(systemName: string, directBomRefs: string[], timestamp: Date): Promise<void> {
    if (directBomRefs.length === 0) return
    const query = await loadQuery('sboms/persist-direct-deps.cypher')
    const ts = timestamp.toISOString()
    for (let i = 0; i < directBomRefs.length; i += SBOMRepository.BATCH_SIZE) {
      const batch = directBomRefs.slice(i, i + SBOMRepository.BATCH_SIZE)
      await this.executeQuery(query, { systemName, directBomRefs: batch, timestamp: ts })
    }
  }

  private async persistDependencies(dependencies: ComponentDependency[], timestamp: Date): Promise<void> {
    if (dependencies.length === 0) return
    const query = await loadQuery('sboms/persist-dependencies.cypher')
    const filtered = dependencies.filter(d => d.dependsOn.length > 0)
    if (filtered.length === 0) return
    const ts = timestamp.toISOString()
    for (let i = 0; i < filtered.length; i += SBOMRepository.BATCH_SIZE) {
      const batch = filtered.slice(i, i + SBOMRepository.BATCH_SIZE)
      await this.executeQuery(query, { dependencies: batch, timestamp: ts })
    }
  }

  /**
   * Upsert (Team)-[:USES]->(Technology) edges for a system.
   *
   * Derives team→technology usage from the ownership chain:
   *   Team -[:OWNS]-> System -[:USES]-> Component -[:IS_VERSION_OF]-> Technology
   *
   * Called after every SBOM ingestion so compliance violation queries
   * have up-to-date USES edges to match against.
   */
  async upsertTeamUsesTechnology(systemName: string): Promise<void> {
    const query = await loadQuery('sboms/upsert-team-uses-technology.cypher')
    await this.executeQuery(query, { systemName })
  }

  async createAuditLog(params: {
    systemName: string
    userId: string
    format: string
    componentsAdded: number
    componentsUpdated: number
    realUserId?: string | null
  }): Promise<void> {
    const query = await loadQuery('sboms/create-audit-log.cypher')
    await this.executeQuery(query, {
      systemName: params.systemName,
      userId: params.userId,
      realUserId: params.realUserId ?? null,
      metadata: JSON.stringify({ format: params.format, added: params.componentsAdded, updated: params.componentsUpdated })
    })
  }
}
