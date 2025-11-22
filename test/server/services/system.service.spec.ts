import { describe, it, expect } from 'vitest'
import { SystemService } from '../../../server/services/system.service'

describe('SystemService', () => {
  it('should be defined as a class', () => {
    expect(SystemService).toBeDefined()
    expect(typeof SystemService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(SystemService.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(SystemService.prototype.findByName).toBeDefined()
  })

  it('should have create method', () => {
    expect(SystemService.prototype.create).toBeDefined()
  })

  it('should have delete method', () => {
    expect(SystemService.prototype.delete).toBeDefined()
  })
})
