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
}

export interface ExternalReference {
  type: string
  url: string
}

export interface PersistSBOMParams {
  systemName: string
  repositoryUrl: string
  components: ExtractedComponent[]
  format: 'cyclonedx' | 'spdx'
  timestamp: Date
}

export interface PersistSBOMResult {
  componentsAdded: number
  componentsUpdated: number
  relationshipsCreated: number
}
