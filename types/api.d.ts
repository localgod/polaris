// Shared API Response Types
// Used by both server and client code

export interface Component {
  name: string
  version: string
  packageManager: string | null
  license: string | null
  sourceRepo: string | null
  importPath: string | null
  hash: string
  technologyName: string | null
  systemCount: number
}

export interface UnmappedComponent {
  name: string
  version: string
  packageManager: string | null
  license: string | null
  sourceRepo: string | null
  importPath: string | null
  hash: string
  systems?: string[]
  systemCount?: number
}

export interface Technology {
  name: string
  category: string
  vendor: string | null
  approvedVersionRange: string | null
  ownerTeam: string | null
  riskLevel: string | null
  lastReviewed: string | null
  ownerTeamName: string | null
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
  versionConstraint?: string
}

export interface System {
  name: string
  domain: string | null
  ownerTeam: string | null
  businessCriticality: string | null
  environment: string | null
  ownerTeamName: string | null
  componentCount: number
}

export interface Team {
  name: string
  email: string | null
  responsibilityArea: string | null
  technologyCount: number
  systemCount: number
}

export interface Policy {
  name: string
  description: string | null
  ruleType: string
  severity: string
  effectiveDate: string | null
  expiryDate: string | null
  enforcedBy: string
  scope: string
  status: string
  enforcerTeam: string | null
  subjectTeams: string[]
  governedTechnologies: string[]
  technologyCount: number
}

export interface Violation {
  violationId: string
  policyName: string
  systemName: string
  componentName: string
  componentVersion: string
  severity: string
  detectedAt: string
  status: string
  resolvedAt: string | null
  notes: string | null
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

export interface ApiSuccessResponse<T> {
  success: true
  data: T[]
  count: number
}

export interface ApiErrorResponse {
  success: false
  error: string
  data: []
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
