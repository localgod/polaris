import { getCurrentUser } from '../../utils/auth'
import {
  versionConstraintService,
  complianceService,
  healthRefreshService,
  componentService,
  gitHubOrgImportService,
  teamService
} from '../../services/singletons'
import { cachedFetch } from '../../utils/cache'
import type { DashboardAttentionSummary } from '~~/types/api'

/**
 * @openapi
 * /dashboard/attention:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get prioritized, actionable dashboard items
 *     description: |
 *       Aggregates the portfolio's actionable signals — compliance violations,
 *       version constraint violations, EOL exposure, vulnerability exposure,
 *       the unlinked-component queue, stewardship/ownership gaps, and GitHub
 *       import job health — into a single "needs attention" summary.
 *     responses:
 *       200:
 *         description: Attention summary retrieved successfully
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  return await cachedFetch(
    `dashboard:attention:v1:${user ? `authenticated:${user.role}` : 'anonymous'}`,
    () => buildAttentionSummary(user),
    30
  )
})

async function buildAttentionSummary(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  const [
    versionViolations,
    compliance,
    healthSummary,
    stewardshipGaps,
    importJobHealth,
    linkQueue
  ] = await Promise.all([
    versionConstraintService.getViolations({}),
    complianceService.findViolations(),
    healthRefreshService.getDashboardSummary(),
    teamService.getStewardshipGaps(),
    gitHubOrgImportService.findRecentActive(),
    currentUser?.role === 'superuser'
      ? componentService.getLinkSuggestions(0, 5)
      : Promise.resolve(null)
  ])

  const data: DashboardAttentionSummary = {
    vulnerabilityExposure: healthSummary.vulnerabilityExposure,
    advisoryHotspots: healthSummary.advisoryHotspots,
    refreshCoverage: healthSummary.refreshCoverage,
    eolExposure: healthSummary.eolExposure,
    complianceViolations: {
      total: compliance.summary.totalViolations,
      teamsAffected: compliance.summary.teamsAffected,
      topViolations: compliance.violations.slice(0, 3).map(v => ({
        team: v.team,
        technology: v.technology,
        violationType: v.violationType,
        systemCount: v.systemCount
      }))
    },
    versionConstraintViolations: {
      total: versionViolations.count,
      critical: versionViolations.summary.critical,
      error: versionViolations.summary.error,
      warning: versionViolations.summary.warning
    },
    componentLinkQueue: linkQueue ? { total: linkQueue.total } : null,
    stewardshipGaps,
    importJobHealth: {
      total: importJobHealth.total,
      jobs: importJobHealth.jobs.map(job => ({
        id: job.id,
        organization: job.organization,
        status: job.status,
        createdAt: job.createdAt
      }))
    }
  }

  return { success: true, data }
}
