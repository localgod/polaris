// Shared API Response Types
// Used by both server and client code

// ============================================================================
// COMPONENT TYPES
// ============================================================================

export type ComponentType = 
  | 'application'
  | 'framework'
  | 'library'
  | 'container'
  | 'platform'
  | 'operating-system'
  | 'device'
  | 'device-driver'
  | 'firmware'
  | 'file'
  | 'machine-learning-model'
  | 'data'

export type DependencyScope = 
  | 'required'
  | 'optional'
  | 'excluded'
  | 'dev'
  | 'test'
  | 'runtime'
  | 'provided'

export interface Hash {
  algorithm: string  // SHA256, SHA512, BLAKE3, etc.
  value: string
}

export interface License {
  id?: string        // SPDX license ID (e.g., "MIT", "Apache-2.0")
  name?: string      // License name
  url?: string       // License URL
  text?: string      // License text
}

export interface ExternalReference {
  type: string       // vcs, website, documentation, issue-tracker, etc.
  url: string
}

export interface Component {
  // === CORE IDENTIFICATION ===
  name: string
  version: string
  packageManager: string | null  // npm, maven, pypi, cargo, etc.
  
  // === UNIVERSAL IDENTIFIERS ===
  purl: string | null            // Package URL (e.g., "pkg:npm/react@18.2.0")
  cpe: string | null             // Common Platform Enumeration
  bomRef: string | null          // Unique identifier within SBOM
  
  // === CLASSIFICATION ===
  type: ComponentType | null     // library, framework, application, etc.
  group: string | null           // Maven groupId, npm scope, etc.
  scope: DependencyScope | null  // required, optional, dev, test, etc.
  
  // === HASHES ===
  hashes: Hash[]                 // Multiple hashes with algorithms
  
  // === LICENSES ===
  licenses: License[]            // Multiple licenses
  copyright: string | null       // Copyright text
  
  // === SUPPLIER/AUTHOR ===
  supplier: string | null        // Organization/person who supplied
  author: string | null          // Original author
  publisher: string | null       // Publisher
  
  // === REFERENCES ===
  homepage: string | null        // Project homepage
  externalReferences: ExternalReference[]  // VCS, docs, issues, etc.
  
  // === METADATA ===
  description: string | null     // Component description
  releaseDate: string | null     // ISO 8601 timestamp
  publishedDate: string | null   // When published to registry
  modifiedDate: string | null    // Last modification
  
  // === RELATIONSHIPS (computed) ===
  technologyName: string | null  // Linked Technology name
  systemCount: number            // Number of systems using this
}

export interface UnmappedComponent {
  // === CORE IDENTIFICATION ===
  name: string
  version: string
  packageManager: string | null
  
  // === UNIVERSAL IDENTIFIERS ===
  purl: string | null
  cpe: string | null
  
  // === CLASSIFICATION ===
  type: ComponentType | null
  group: string | null
  
  // === HASHES ===
  hashes: Hash[]
  
  // === LICENSES ===
  licenses: License[]
  
  // === RELATIONSHIPS (computed) ===
  systems?: string[]
  systemCount?: number
}

export type TechnologyDomain =
  | 'foundational-runtime'
  | 'framework'
  | 'data-platform'
  | 'integration-platform'
  | 'security-identity'
  | 'infrastructure'
  | 'observability'
  | 'developer-tooling'
  | 'other'

export interface Technology {
  name: string
  type: ComponentType | null
  domain: TechnologyDomain | null
  vendor: string | null
  lastReviewed: string | null
  ownerTeamName: string | null
  componentCount: number
  constraintCount: number
  versions: string[]
  approvals: TechnologyApproval[]
}

export interface TechnologyApproval {
  team?: string
  time?: string
  approvedAt?: string
  deprecatedAt?: string
  eolDate?: string
  migrationTarget?: string
  notes?: string
  approvedBy?: string
}

export interface System {
  name: string
  domain: string | null
  ownerTeam: string | null
  businessCriticality: string | null
  environment: string | null
  componentCount: number
  repositoryCount: number
  lastSbomScanAt: string | null
}

export interface Repository {
  url: string
  name: string
  createdAt: string | null
  updatedAt: string | null
  lastSbomScanAt: string | null
  systemCount?: number
}

export interface Team {
  name: string
  email: string | null
  responsibilityArea: string | null
  technologyCount: number
  systemCount: number
}

export interface VersionConstraint {
  name: string
  description: string | null
  severity: string
  scope: string
  subjectTeam: string | null
  versionRange: string | null
  status: string
  subjectTeams: string[]
  governedTechnologies: string[]
  technologyCount: number
}

export interface User {
  id: string
  email: string
  name: string | null
  role: string
  provider: string
  avatarUrl: string | null
  lastLogin: string | null
  createdAt: string | null
  teams: string[]
}

export interface LicenseViolation {
  teamName: string
  systemName: string
  componentName: string
  componentVersion: string
  componentPurl: string | null
  licenseId: string
  licenseName: string
  licenseCategory: string | null
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T[]
  count: number
  total?: number  // Total count without pagination (for filtered results)
}

export interface ApiErrorResponse {
  success: false
  error: string
  data: []
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
