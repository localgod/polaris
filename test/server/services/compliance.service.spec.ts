import { describe, it, expect } from 'vitest'
import { ComplianceService } from '../../../server/services/compliance.service'

describe('ComplianceService', () => {
  it('should be defined as a class', () => {
    expect(ComplianceService).toBeDefined()
    expect(typeof ComplianceService).toBe('function')
  })

  it('should have findViolations method', () => {
    expect(ComplianceService.prototype.findViolations).toBeDefined()
  })
})
