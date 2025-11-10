import { ComplianceRepository, type ComplianceViolation } from '../repositories/compliance.repository'

interface TeamSummary {
  team: string
  violationCount: number
  systemsAffected: number
}

interface ViolationSummary {
  totalViolations: number
  teamsAffected: number
  byTeam: TeamSummary[]
}

export interface ViolationResult {
  violations: ComplianceViolation[]
  summary: ViolationSummary
}

/**
 * Service for compliance-related business logic
 */
export class ComplianceService {
  private complianceRepo: ComplianceRepository

  constructor() {
    this.complianceRepo = new ComplianceRepository()
  }

  /**
   * Get all compliance violations with summary
   * 
   * Retrieves violations where teams use technologies without approval
   * or marked for elimination. Includes aggregated summary by team.
   * 
   * Use cases:
   * - Identify compliance risks across the organization
   * - Track technology elimination progress
   * - Prioritize remediation efforts by impact
   * 
   * @returns Violations with summary statistics
   */
  async findViolations(): Promise<ViolationResult> {
    const violations = await this.complianceRepo.findViolations()
    const summary = this.calculateSummary(violations)
    
    return {
      violations,
      summary
    }
  }

  /**
   * Calculate summary statistics from violations
   * Groups violations by team and calculates impact metrics
   */
  private calculateSummary(violations: ComplianceViolation[]): ViolationSummary {
    // Group by team
    const byTeam = violations.reduce((acc, v) => {
      const teamKey = v.team
      if (!acc[teamKey]) {
        acc[teamKey] = []
      }
      acc[teamKey]?.push(v)
      return acc
    }, {} as Record<string, ComplianceViolation[]>)
    
    // Calculate team summaries
    const teamSummaries: TeamSummary[] = Object.entries(byTeam).map(([team, viols]) => ({
      team,
      violationCount: viols.length,
      systemsAffected: viols.reduce((sum, v) => sum + v.systemCount, 0)
    }))
    
    return {
      totalViolations: violations.length,
      teamsAffected: Object.keys(byTeam).length,
      byTeam: teamSummaries
    }
  }
}
