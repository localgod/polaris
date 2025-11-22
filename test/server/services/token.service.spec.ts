import { describe, it, expect } from 'vitest'
import { TokenService } from '../../../server/services/token.service'

describe('TokenService', () => {
  it('should be defined as a class', () => {
    expect(TokenService).toBeDefined()
    expect(typeof TokenService).toBe('function')
  })

  it('should have createToken method', () => {
    expect(TokenService.prototype.createToken).toBeDefined()
  })

  it('should have resolveToken method', () => {
    expect(TokenService.prototype.resolveToken).toBeDefined()
  })

  it('should have revokeToken method', () => {
    expect(TokenService.prototype.revokeToken).toBeDefined()
  })

  it('should have listTokens method', () => {
    expect(TokenService.prototype.listTokens).toBeDefined()
  })
})
