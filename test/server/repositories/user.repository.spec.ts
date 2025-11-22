import { describe, it, expect } from 'vitest'
import { UserRepository } from '../../../server/repositories/user.repository'

describe('UserRepository', () => {
  it('should be defined as a class', () => {
    expect(UserRepository).toBeDefined()
    expect(typeof UserRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(UserRepository.prototype.findAll).toBeDefined()
  })

  it('should have findById method', () => {
    expect(UserRepository.prototype.findById).toBeDefined()
  })

  it('should have createOrUpdateUser method', () => {
    expect(UserRepository.prototype.createOrUpdateUser).toBeDefined()
  })

  it('should have assignTeams method', () => {
    expect(UserRepository.prototype.assignTeams).toBeDefined()
  })
})
