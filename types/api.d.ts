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
  scope: DependencyScope | null  // runtime, required, optional, dev, excluded — from USES edge (null when no system context)
  isDirect: boolean | null       // true = direct dep of the queried system; null when no system context
  
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

export interface GroupedComponentVersion {
  name: string
  version: string
  packageManager: string | null
  purl: string | null
  cpe: string | null
  bomRef: string | null
  type: ComponentType | null
  group: string | null
  scope: DependencyScope | null
  isDirect: boolean | null
  licenses: License[]
  homepage: string | null
  externalReferences: ExternalReference[]
  description: string | null
  releaseDate: string | null
  publishedDate: string | null
  modifiedDate: string | null
  technologyName: string | null
  systemCount: number
}

export interface GroupedComponent {
  name: string
  group: string | null
  packageManager: string | null
  versions: string[]
  versionDetails: GroupedComponentVersion[]
  versionRange: string | null
  systemCount: number
  licenses: License[]
  types: ComponentType[]
  primaryType: ComponentType | null
  purl: string | null
  description: string | null
}

export interface ComponentSystemUsage {
  name: string
  scope: DependencyScope | null
  isDirect: boolean | null
}

export interface ComponentDirectDependency {
  name: string
  group: string | null
  version: string
  packageManager: string | null
  purl: string | null
  scope: DependencyScope | null
  isDirect: boolean
}

export interface DependencyNode {
  name: string
  group: string | null
  version: string
  packageManager: string | null
  purl: string | null
  scope: DependencyScope | null
  isDirect: boolean
  depth: number
  children?: DependencyNode[]
  isCircular?: boolean
}

export interface DependencyTreeResponse {
  componentKey: string
  dependencies: DependencyNode[]
  totalCount: number
  hasCircularDependencies: boolean
  truncated: boolean
  maxDepth: number
}

export type EOLStatusValue = 'active' | 'approaching_eol' | 'unsupported' | 'unknown'

export interface EOLStatus {
  status: EOLStatusValue
  productName: string | null
  productLabel: string | null
  matchedCycle: string | null
  eolDate: string | null
  supportEndDate: string | null
  daysUntilEOL: number | null
  daysSinceEOL: number | null
  lts: boolean | null
  latestVersion: string | null
  latestReleaseDate: string | null
  source: {
    name: 'endoflife.date'
    url: string | null
  }
  reason?: 'no_mapping' | 'no_data' | 'no_matching_cycle' | 'fetch_failed'
}

export type PackageMetadataStatus = 'available' | 'unavailable'

export type PackageMetadataUnavailableReason =
  | 'missing_purl'
  | 'malformed_purl'
  | 'unsupported_ecosystem'
  | 'package_not_found'
  | 'version_not_found'
  | 'fetch_failed'

export interface PackageAdvisory {
  id: string
  url: string | null
}

export type PackageMetadataSource = 'deps.dev' | 'npm' | 'pypi' | 'maven'

export interface PackageMetadata {
  status: PackageMetadataStatus
  reason?: PackageMetadataUnavailableReason
  system: string | null
  packageName: string | null
  currentVersion: string | null
  latestVersion: string | null
  defaultVersion: string | null
  publishedAt: string | null
  isDeprecated: boolean | null
  deprecatedReason: string | null
  licenses: string[]
  advisoryCount: number | null
  advisories: PackageAdvisory[]
  recentReleases: number | null
  source: {
    name: PackageMetadataSource
    url: string | null
  }
}

export interface HealthDashboardSummary {
  vulnerabilityExposure: {
    vulnerableComponents: number
    criticalComponents: number
    highComponents: number
    affectedSystems: number
    criticalVulnerabilities: number
    highVulnerabilities: number
  }
  advisoryHotspots: Array<{
    id: string
    aliases: string[]
    summary: string | null
    cvssScore: number | null
    affectedComponents: number
    affectedSystems: number
  }>
  refreshCoverage: {
    totalComponents: number
    refreshedComponents: number
    staleComponents: number
    neverCheckedComponents: number
    failedItems: number
  }
  criticalSystemsAtRisk: {
    systems: number
    criticalSystems: number
    highSystems: number
    affectedComponents: number
  }
  eolExposure: {
    total: number
    topItems: Array<{ name: string; version: string | null; systemCount: number }>
  }
}

export interface DashboardAttentionSummary {
  vulnerabilityExposure: HealthDashboardSummary['vulnerabilityExposure']
  advisoryHotspots: HealthDashboardSummary['advisoryHotspots']
  refreshCoverage: HealthDashboardSummary['refreshCoverage']
  eolExposure: HealthDashboardSummary['eolExposure']
  complianceViolations: {
    total: number
    teamsAffected: number
    topViolations: Array<{
      team: string
      technology: string
      violationType: string
      systemCount: number
    }>
  }
  versionConstraintViolations: {
    total: number
    critical: number
    error: number
    warning: number
  }
  componentLinkQueue: { total: number } | null
  stewardshipGaps: {
    unstewardedTechnologies: number
    unstewardedPlatforms: number
    unownedSystems: number
    sampleTechnologies: string[]
    samplePlatforms: string[]
    sampleSystems: string[]
  }
  importJobHealth: {
    total: number
    jobs: Array<{ id: string; organization: string; status: string; createdAt: string }>
  }
}

export type VersionSprawlSeverity = 'high' | 'medium' | 'low'

export interface VersionSprawlVersionBreakdown {
  version: string
  systemCount: number
  systems: string[]
}

export interface VersionSprawlDetection {
  technologyName: string
  versions: string[]
  versionCount: number
  versionRange: { oldest: string; newest: string }
  affectedSystemCount: number
  versionBreakdown: VersionSprawlVersionBreakdown[]
  sprawlScore: number
  severity: VersionSprawlSeverity
  recommendedVersion: string
  hasEolVersion: boolean
}

export interface VersionSprawlSummary {
  high: number
  medium: number
  low: number
  total: number
}

export type MaintenanceHealthStatus = 'healthy' | 'stable' | 'aging' | 'stale' | 'unknown'

export type MaintenanceHealthConfidence = 'high' | 'medium' | 'low'

export type MaintenanceHealthReasonCode =
  | 'insufficient_data'
  | 'missing_release_date'
  | 'invalid_release_date'
  | 'missing_version'
  | 'unsupported_version_scheme'
  | 'metadata_unavailable'
  | 'version_recent'
  | 'version_moderately_old'
  | 'version_old'
  | 'version_very_old'
  | 'mature_version'
  | 'pre_1_0_version'
  | 'upstream_recent_activity'
  | 'upstream_no_recent_activity'
  | 'update_status_unknown'
  | 'current_version_current'
  | 'patch_update_available'
  | 'minor_update_available'
  | 'major_update_available'
  | 'package_deprecated'
  | 'advisories_reported'

export type MaintenanceHealthInput =
  | 'component.releaseDate'
  | 'component.publishedDate'
  | 'component.modifiedDate'
  | 'component.version'
  | 'packageMetadata.publishedAt'
  | 'packageMetadata.currentVersion'
  | 'packageMetadata.latestVersion'
  | 'packageMetadata.recentReleases'
  | 'packageMetadata.isDeprecated'
  | 'packageMetadata.advisoryCount'

export interface MaintenanceHealth {
  status: MaintenanceHealthStatus
  confidence: MaintenanceHealthConfidence
  ageInDays: number | null
  isMature: boolean | null
  currentVersion: string | null
  latestVersion: string | null
  updateType: 'none' | 'patch' | 'minor' | 'major' | 'unknown'
  recentActivity: boolean | null
  reasonCodes: MaintenanceHealthReasonCode[]
  inputsUsed: MaintenanceHealthInput[]
  calculatedAt: string
}

export type SecurityScorecardStatus = 'available' | 'unavailable'

export type SecurityScorecardUnavailableReason =
  | 'missing_repository'
  | 'unsupported_repository'
  | 'repository_not_found'
  | 'fetch_failed'

export interface SecurityScorecardCheck {
  name: string
  score: number | null
  reason: string | null
}

export interface SecurityScorecard {
  status: SecurityScorecardStatus
  reason?: SecurityScorecardUnavailableReason
  repository: {
    host: 'github.com'
    owner: string
    name: string
    url: string
  } | null
  score: number | null
  checks: SecurityScorecardCheck[]
  scannedAt: string | null
  source: {
    name: 'OpenSSF Scorecard'
    url: string | null
  }
}

export type VulnerabilityStatus = 'available' | 'unavailable'

export type VulnerabilityUnavailableReason =
  | 'missing_purl'
  | 'fetch_failed'

export interface KnownVulnerabilitySeverity {
  type: string | null
  score: string | null
  cvssScore: number | null
}

export interface KnownVulnerability {
  id: string
  aliases: string[]
  summary: string | null
  severity: KnownVulnerabilitySeverity | null
  affectedRanges: string[]
  advisoryUrl: string
  publishedAt: string | null
  modifiedAt: string | null
}

export interface VulnerabilityReport {
  status: VulnerabilityStatus
  reason?: VulnerabilityUnavailableReason
  vulnerabilities: KnownVulnerability[]
  source: {
    name: 'OSV.dev'
    url: string | null
  }
}

export interface ComponentDetail extends Component {
  systems: ComponentSystemUsage[]
  directDependencies: ComponentDirectDependency[]
  eol: EOLStatus | null
  packageMetadata: PackageMetadata | null
  maintenanceHealth: MaintenanceHealth | null
  securityScorecard: SecurityScorecard | null
  vulnerabilities: VulnerabilityReport | null
}

export interface TechnologyVersionLifecycle {
  version: string
  storedEolDate: string | null
  lifecycle: EOLStatus
}

export interface TechnologyLifecycleSummary {
  status: EOLStatusValue
  unsupportedCount: number
  approachingCount: number
  activeCount: number
  unknownCount: number
}

export interface EOLRollupSystem {
  name: string
}

export interface EOLRollupComponentItem {
  kind: 'component'
  key: string
  name: string
  group: string | null
  version: string
  packageManager: string | null
  purl: string | null
  technologyName: string | null
  systems: EOLRollupSystem[]
  systemCount: number
  lifecycle: EOLStatus
}

export interface EOLRollupTechnologyItem {
  kind: 'technology'
  name: string
  version: string
  componentCount: number
  systems: EOLRollupSystem[]
  systemCount: number
  lifecycle: EOLStatus
}

export type EOLRollupItem = EOLRollupComponentItem | EOLRollupTechnologyItem

export interface EOLRollupResponse {
  windowDays: number
  items: EOLRollupItem[]
  summary: {
    components: number
    technologies: number
    systems: number
  }
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

export type TimeValue = 'tolerate' | 'invest' | 'migrate' | 'eliminate'

export type BusinessCriticality = 'critical' | 'high' | 'medium' | 'low'

export type SystemEnvironment = 'dev' | 'test' | 'staging' | 'prod'

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

/**
 * A manually-declared, non-SBOM-observable technology (databases, cloud
 * services, container runtimes) — the deliberate "no evidence required"
 * counterpart to Technology, which requires a linked Component.
 */
export interface Platform {
  name: string
  type: ComponentType | null
  domain: TechnologyDomain | null
  vendor: string | null
  stewardTeamName: string | null
  approvals: TechnologyApproval[]
}

export interface TechnologyApproval {
  team?: string
  time?: TimeValue
  environment?: SystemEnvironment | null
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
  businessCriticality: BusinessCriticality | null
  environment: SystemEnvironment | null
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
  usedTechnologyCount?: number
  memberCount?: number
  members?: Array<{ name: string; email: string; role: 'Manager' | 'Member' }>
  systems?: Array<{ name: string; businessCriticality: string | null; environment: string | null }>
  technologies?: Array<{ name: string; type: string | null; timeCategory: string | null; relationship: 'Steward' | 'User' }>
  approvals?: Array<{ technologyName: string; timeCategory: string | null; approvedAt: string | null; approvedBy: string | null }>
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
  systemBusinessCriticality: BusinessCriticality | null
  systemEnvironment: SystemEnvironment | null
  componentName: string
  componentVersion: string
  componentPurl: string | null
  licenseId: string
  licenseName: string
  licenseCategory: string | null
}

export type ScorecardCheckId =
  | 'sbom-freshness'
  | 'no-eliminate-violations'
  | 'no-license-violations'
  | 'no-critical-version-violations'
  | 'time-classification-coverage'

export interface ScorecardCheck {
  id: ScorecardCheckId
  label: string
  passed: boolean
  detail: string
}

export interface Scorecard {
  score: number
  maxScore: number
  checks: ScorecardCheck[]
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
