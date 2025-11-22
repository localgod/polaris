import { describe, it, expect } from 'vitest'
import { UserService } from '../../../server/services/user.service'

describe('UserService', () => {
  it('should be defined as a class', () => {
    expect(UserService).toBeDefined()
    expect(typeof UserService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(UserService.prototype.findAll).toBeDefined()
  })

  it('should have getAuthData method', () => {
    expect(UserService.prototype.getAuthData).toBeDefined()
  })

  it('should have createOrUpdateUser method', () => {
    expect(UserService.prototype.createOrUpdateUser).toBeDefined()
  })

  it('should have findById method', () => {
    expect(UserService.prototype.findById).toBeDefined()
  })
})
