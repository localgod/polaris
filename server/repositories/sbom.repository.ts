import { BaseRepository } from './base.repository'
import type { PersistSBOMParams, PersistSBOMResult } from '../types/sbom'

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
  // Number of components processed per transaction. Each component carries its
  // own hashes/licenses/refs so Neo4j never holds the full batch lists in scope
  // per row. Reduce further if individual components are unusually large.
  private static readonly BATCH_SIZE = 50

  async persistSBOM(params: PersistSBOMParams): Promise<PersistSBOMResult> {
    const query = await loadQuery('sboms/persist-components-flat.cypher')
    const timestamp = params.timestamp.toISOString()

    // Embed hashes/licenses/refs inside each component so the Cypher query can
    // access comp.hashes directly per row instead of filtering a global list.
    // This avoids the O(n²) pattern where $hashes was scanned for every UNWIND row.
    const allComponents = params.components.map((comp) => ({
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
      hashes: comp.hashes.map(h => ({ algorithm: h.algorithm, value: h.value })),
      licenses: comp.licenses.map(l => ({ id: l.id, name: l.name, url: l.url, text: l.text, expression: l.expression })),
      externalReferences: comp.externalReferences.map(r => ({ type: r.type, url: r.url }))
    }))

    let componentsAdded = 0
    let componentsUpdated = 0
    let relationshipsCreated = 0

    // Process in batches — each batch is its own transaction
    for (let start = 0; start < allComponents.length; start += SBOMRepository.BATCH_SIZE) {
      const batchComponents = allComponents.slice(start, start + SBOMRepository.BATCH_SIZE)

      const { records } = await this.executeQueryWithSession(query, {
        systemName: params.systemName,
        components: batchComponents,
        timestamp
      })

      if (records.length > 0) {
        componentsAdded += records[0]!.get('componentsAdded').toNumber()
        componentsUpdated += records[0]!.get('componentsUpdated').toNumber()
        relationshipsCreated += records[0]!.get('relationshipsCreated').toNumber()
      }
    }

    return { componentsAdded, componentsUpdated, relationshipsCreated }
  }

  async createAuditLog(params: {
    systemName: string
    userId: string
    format: string
    componentsAdded: number
    componentsUpdated: number
    realUserId?: string | null
  }): Promise<void> {
    await this.executeQuery(`
      MATCH (s:System {name: $systemName})
      CREATE (a:AuditLog {
        id: randomUUID(),
        timestamp: datetime(),
        operation: 'IMPORT_SBOM',
        entityType: 'System',
        entityId: s.name,
        entityLabel: s.name,
        changedFields: ['components'],
        source: 'API',
        userId: $userId,
        realUserId: $realUserId,
        metadata: $metadata
      })
      CREATE (a)-[:AUDITS]->(s)
    `, {
      systemName: params.systemName,
      userId: params.userId,
      realUserId: params.realUserId ?? null,
      metadata: `format=${params.format} added=${params.componentsAdded} updated=${params.componentsUpdated}`
    })
  }
}
