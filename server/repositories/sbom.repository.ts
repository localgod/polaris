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
    const coreQuery    = await loadQuery('sboms/persist-components-core.cypher')
    const hashesQuery  = await loadQuery('sboms/persist-component-hashes.cypher')
    const licensesQuery = await loadQuery('sboms/persist-component-licenses.cypher')
    const extRefsQuery = await loadQuery('sboms/persist-component-extrefs.cypher')
    const timestamp = params.timestamp.toISOString()

    // Scalar fields only — sent in phase 1 (large batches, cheap).
    // scope and isDirect come from the BFS-computed componentUsage map rather
    // than directly from the component object — they are edge properties that
    // describe how this system uses the component, not intrinsic component data.
    const coreComponents = params.components.map((comp) => {
      const usage = comp.bomRef ? params.componentUsage.get(comp.bomRef) : undefined
      return {
        name: comp.name,
        version: comp.version,
        packageManager: comp.packageManager,
        purl: comp.purl,
        cpe: comp.cpe,
        bomRef: comp.bomRef,
        type: comp.type,
        group: comp.group,
        scope: usage?.scope ?? null,
        isDirect: usage?.isDirect ?? false,
        copyright: comp.copyright,
        supplier: comp.supplier,
        author: comp.author,
        publisher: comp.publisher,
        homepage: comp.homepage,
        description: comp.description,
      }
    })

    // Relation fields — sent in phase 2 (small batches, three separate transactions).
    // license text is intentionally omitted: it is only stored on first creation
    // (handled in the Cypher ON CREATE SET), so sending it on every ingestion
    // wastes Bolt bandwidth for no benefit.
    const relComponents = params.components.map((comp) => ({
      purl: comp.purl,
      name: comp.name,
      version: comp.version,
      hashes: comp.hashes.map(h => ({ algorithm: h.algorithm, value: h.value })),
      licenses: comp.licenses.map(l => ({ id: l.id, name: l.name, url: l.url, expression: l.expression })),
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

    // Phase 2: Replace hashes, licenses, external refs — each in its own
    // transaction per batch to eliminate chained eager barriers.
    for (let i = 0; i < relComponents.length; i += SBOMRepository.RELATIONS_BATCH_SIZE) {
      const batch = relComponents.slice(i, i + SBOMRepository.RELATIONS_BATCH_SIZE)
      await this.executeQueryWithSession(hashesQuery,   { components: batch, timestamp })
      await this.executeQueryWithSession(licensesQuery, { components: batch, timestamp })
      await this.executeQueryWithSession(extRefsQuery,  { components: batch, timestamp })
    }

    // Persist DEPENDS_ON edges between components
    if (params.dependencies.length > 0) {
      await this.persistDependencies(params.dependencies, params.timestamp)
    }



    return { componentsAdded, componentsUpdated, relationshipsCreated }
  }



  private async persistDependencies(dependencies: ComponentDependency[], timestamp: Date): Promise<void> {
    if (dependencies.length === 0) return
    const query = await loadQuery('sboms/persist-dependencies.cypher')
    const ts = timestamp.toISOString()

    // Flatten to { ref, targetRef } pairs so the Cypher query uses a single
    // UNWIND. This keeps the working set at most BATCH_SIZE rows rather than
    // multiplying it by the average dependsOn list length.
    const pairs = dependencies
      .filter(d => d.dependsOn.length > 0)
      .flatMap(d => d.dependsOn.map(targetRef => ({ ref: d.ref, targetRef })))

    if (pairs.length === 0) return

    for (let i = 0; i < pairs.length; i += SBOMRepository.BATCH_SIZE) {
      const batch = pairs.slice(i, i + SBOMRepository.BATCH_SIZE)
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
