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
  // Number of components processed per transaction. Keeps each transaction
  // well within Neo4j's per-transaction memory limit even for large SBOMs.
  private static readonly BATCH_SIZE = 100

  async persistSBOM(params: PersistSBOMParams): Promise<PersistSBOMResult> {
    const query = await loadQuery('sboms/persist-components-flat.cypher')
    const timestamp = params.timestamp.toISOString()

    // Flatten all components with a stable global index so that the
    // associated hashes/licenses/references can be correlated per batch.
    const allComponents = params.components.map((comp, index) => ({
      index,
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
      description: comp.description
    }))

    const allHashes = params.components.flatMap((comp, index) =>
      comp.hashes.map(h => ({ componentIndex: index, algorithm: h.algorithm, value: h.value }))
    )
    const allLicenses = params.components.flatMap((comp, index) =>
      comp.licenses.map(l => ({ componentIndex: index, id: l.id, name: l.name, url: l.url, text: l.text, expression: l.expression }))
    )
    const allReferences = params.components.flatMap((comp, index) =>
      comp.externalReferences.map(r => ({ componentIndex: index, type: r.type, url: r.url }))
    )

    let componentsAdded = 0
    let componentsUpdated = 0
    let relationshipsCreated = 0

    // Process in batches — each batch is its own transaction
    for (let start = 0; start < allComponents.length; start += SBOMRepository.BATCH_SIZE) {
      const batchComponents = allComponents.slice(start, start + SBOMRepository.BATCH_SIZE)
      const batchIndices = new Set(batchComponents.map(c => c.index))

      const batchHashes = allHashes.filter(h => batchIndices.has(h.componentIndex))
      const batchLicenses = allLicenses.filter(l => batchIndices.has(l.componentIndex))
      const batchReferences = allReferences.filter(r => batchIndices.has(r.componentIndex))

      const { records } = await this.executeQueryWithSession(query, {
        systemName: params.systemName,
        components: batchComponents,
        hashes: batchHashes,
        licenses: batchLicenses,
        externalReferences: batchReferences,
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
  }): Promise<void> {
    const query = await loadQuery('sboms/create-audit-log.cypher')
    await this.executeQuery(query, {
      systemName: params.systemName,
      userId: params.userId,
      metadata: JSON.stringify({ format: params.format, added: params.componentsAdded, updated: params.componentsUpdated })
    })
  }
}
