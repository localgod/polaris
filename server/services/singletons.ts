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

export const technologyService = new TechnologyService()
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
