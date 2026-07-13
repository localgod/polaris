/**
 * Module-level service singletons.
 *
 * All service classes are stateless (no per-request data), so a single
 * shared instance per process is sufficient.  Creating one instance here
 * avoids repeated object allocation and GC pressure under load.
 *
 * This file is intentionally separate from the individual service modules
 * so that test files can auto-mock a service class without triggering the
 * instantiation of its singleton (which would require a live Neo4j driver).
 */

import { TechnologyService } from './technology.service'
import { PlatformService } from './platform.service'
import { TeamService } from './team.service'
import { SystemService } from './system.service'
import { UserService } from './user.service'
import { TokenService } from './token.service'
import { ComplianceService } from './compliance.service'
import { ComponentService } from './component.service'
import { LicenseService } from './license.service'
import { VersionConstraintService } from './version-constraint.service'
import { SBOMService } from './sbom.service'
import { SourceRepositoryService } from './source-repository.service'
import { AuditLogService } from './audit-log.service'
import { GitHubImportService } from './github-import.service'
import { GitHubOrgImportService } from './github-org-import.service'
import { EOLService } from './eol.service'
import { EOLRollupService } from './eol-rollup.service'
import { PackageMetadataService } from './package-metadata.service'
import { SecurityScoreService } from './security-score.service'
import { VulnerabilityService } from './vulnerability.service'
import { HealthRefreshService } from './health-refresh.service'
import { ScorecardService } from './scorecard.service'
import { VersionSprawlService } from './version-sprawl.service'

export const technologyService = new TechnologyService()
export const platformService = new PlatformService()
export const teamService = new TeamService()
export const systemService = new SystemService()
export const userService = new UserService()
export const tokenService = new TokenService()
export const complianceService = new ComplianceService()
export const componentService = new ComponentService()
export const licenseService = new LicenseService()
export const versionConstraintService = new VersionConstraintService()
export const sbomService = new SBOMService()
export const sourceRepositoryService = new SourceRepositoryService()
export const auditLogService = new AuditLogService()
export const gitHubImportService = new GitHubImportService()
export const gitHubOrgImportService = new GitHubOrgImportService()
export const eolService = new EOLService()
export const eolRollupService = new EOLRollupService()
export const packageMetadataService = new PackageMetadataService()
export const securityScoreService = new SecurityScoreService()
export const vulnerabilityService = new VulnerabilityService()
export const healthRefreshService = new HealthRefreshService()
export const scorecardService = new ScorecardService()
export const versionSprawlService = new VersionSprawlService()
