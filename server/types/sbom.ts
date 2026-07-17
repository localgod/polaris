/**
 * SBOM processing types
 * 
 * Types for extracting and persisting SBOM data from CycloneDX and SPDX formats.
 */

export interface ProcessSBOMInput {
  sbom: unknown
  repositoryUrl: string
  format: 'cyclonedx' | 'spdx'
  userId: string
  realUserId?: string | null
}

export interface ProcessSBOMResult {
  systemName: string
  repositoryUrl: string
  componentsAdded: number
  componentsUpdated: number
  relationshipsCreated: number
}

export interface ExtractedComponent {
  name: string
  version: string | null
  packageManager: string | null
  purl: string | null
  cpe: string | null
  bomRef: string | null
  type: string | null
  group: string | null
  scope: string | null
  hashes: ComponentHash[]
  licenses: ComponentLicense[]
  copyright: string | null
  supplier: string | null
  author: string | null
  publisher: string | null
  homepage: string | null
  description: string | null
  externalReferences: ExternalReference[]
}

export interface ComponentHash {
  algorithm: string
  value: string
}

export interface ComponentLicense {
  id: string | null
  name: string | null
  url: string | null
  text: string | null
  expression: string | null
}

export interface ExternalReference {
  type: string
  url: string
}

export interface ComponentDependency {
  /** bom-ref of the component that has dependencies */
  ref: string
  /** bom-refs of its direct dependencies */
  dependsOn: string[]
}

/**
 * A single directed dependency edge with an associated scope.
 * Used internally during SPDX ingestion to carry per-edge scope
 * through the BFS propagation pass.
 */
export interface ScopedEdge {
  /** bom-ref of the source component */
  from: string
  /** bom-ref of the target component */
  to: string
  /** Scope derived from the SPDX relationship type, or null for CycloneDX */
  scope: string | null
}

/**
 * Computed classification for a single component relative to a system.
 *
 * Produced by the BFS scope propagation pass in the service layer and
 * consumed by the repository to set properties on the USES edge.
 *
 * scope values:
 *   'runtime'  — reachable from a runtime/required direct dep (or IS a runtime direct dep)
 *   'required' — synonym for 'runtime'; used by CycloneDX 'required' and SPDX DEPENDS_ON
 *   'dev'      — reachable only from dev/test direct deps
 *   'optional' — reachable only from optional/provided direct deps
 *   'excluded' — CycloneDX excluded scope; persisted but excluded from runtime queries
 *   null       — not reachable by BFS (orphaned / missing bomRef)
 */
export interface ComponentUsage {
  bomRef: string
  scope: string | null
  isDirect: boolean
}

export interface PersistSBOMParams {
  systemName: string
  repositoryUrl: string
  components: ExtractedComponent[]
  dependencies: ComponentDependency[]
  /**
   * Per-component usage classification (scope + isDirect) computed by BFS
   * in the service layer. Keyed by bomRef.
   */
  componentUsage: Map<string, ComponentUsage>
  format: 'cyclonedx' | 'spdx'
  timestamp: Date
}

export interface PersistSBOMResult {
  componentsAdded: number
  componentsUpdated: number
  relationshipsCreated: number
  addedComponents: AddedComponent[]
}

/** Identity of a component newly created during SBOM persistence, used for granular per-component audit entries. */
export interface AddedComponent {
  name: string
  version: string | null
  purl: string | null
}
