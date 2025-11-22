import { describe, it, expect } from 'vitest'
import { ComplianceRepository } from '../../../server/repositories/compliance.repository'

describe('ComplianceRepository', () => {
  it('should be defined as a class', () => {
    expect(ComplianceRepository).toBeDefined()
    expect(typeof ComplianceRepository).toBe('function')
  })

  it('should have findViolations method', () => {
    expect(ComplianceRepository.prototype.findViolations).toBeDefined()
  })
})
