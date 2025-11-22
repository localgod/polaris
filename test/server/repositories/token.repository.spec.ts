import { describe, it, expect } from 'vitest'
import { TokenRepository } from '../../../server/repositories/token.repository'

describe('TokenRepository', () => {
  it('should be defined as a class', () => {
    expect(TokenRepository).toBeDefined()
    expect(typeof TokenRepository).toBe('function')
  })

  it('should have create method', () => {
    expect(TokenRepository.prototype.create).toBeDefined()
  })

  it('should have findByHash method', () => {
    expect(TokenRepository.prototype.findByHash).toBeDefined()
  })

  it('should have revoke method', () => {
    expect(TokenRepository.prototype.revoke).toBeDefined()
  })

  it('should have listByUser method', () => {
    expect(TokenRepository.prototype.listByUser).toBeDefined()
  })
})
