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
  async persistSBOM(params: PersistSBOMParams): Promise<PersistSBOMResult> {
    const query = await loadQuery('sboms/persist-components-flat.cypher')
    
    // Flatten the data structure to avoid nested object issues
    // Pass components without nested arrays, then pass arrays separately
    const flatComponents = params.components.map((comp, index) => ({
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
    
    const flatHashes = params.components.flatMap((comp, index) =>
      comp.hashes.map(h => ({
        componentIndex: index,
        algorithm: h.algorithm,
        value: h.value
      }))
    )
    
    const flatLicenses = params.components.flatMap((comp, index) =>
      comp.licenses.map(l => ({
        componentIndex: index,
        id: l.id,
        name: l.name,
        url: l.url,
        text: l.text
      }))
    )
    
    const flatReferences = params.components.flatMap((comp, index) =>
      comp.externalReferences.map(r => ({
        componentIndex: index,
        type: r.type,
        url: r.url
      }))
    )
    
    // Use session-based transaction
    const { records } = await this.executeQueryWithSession(query, {
      systemName: params.systemName,
      components: flatComponents,
      hashes: flatHashes,
      licenses: flatLicenses,
      externalReferences: flatReferences,
      timestamp: params.timestamp.toISOString()
    })
    
    if (records.length === 0) {
      return {
        componentsAdded: 0,
        componentsUpdated: 0,
        relationshipsCreated: 0
      }
    }
    
    return {
      componentsAdded: records[0].get('componentsAdded').toNumber(),
      componentsUpdated: records[0].get('componentsUpdated').toNumber(),
      relationshipsCreated: records[0].get('relationshipsCreated').toNumber()
    }
  }
}
