import { describe, it, expect } from 'vitest'
import { PolicyService } from '../../../server/services/policy.service'

describe('PolicyService', () => {
  it('should be defined as a class', () => {
    expect(PolicyService).toBeDefined()
    expect(typeof PolicyService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(PolicyService.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(PolicyService.prototype.findByName).toBeDefined()
  })

  it('should have getViolations method', () => {
    expect(PolicyService.prototype.getViolations).toBeDefined()
  })

  it('should have delete method', () => {
    expect(PolicyService.prototype.delete).toBeDefined()
  })
})
