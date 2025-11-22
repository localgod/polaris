import { describe, it, expect } from 'vitest'
import { PolicyRepository } from '../../../server/repositories/policy.repository'

describe('PolicyRepository', () => {
  it('should be defined as a class', () => {
    expect(PolicyRepository).toBeDefined()
    expect(typeof PolicyRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(PolicyRepository.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(PolicyRepository.prototype.findByName).toBeDefined()
  })

  it('should have exists method', () => {
    expect(PolicyRepository.prototype.exists).toBeDefined()
  })

  it('should have delete method', () => {
    expect(PolicyRepository.prototype.delete).toBeDefined()
  })
})
