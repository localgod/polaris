import { describe, it, expect } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'

describe('ComponentService', () => {
  it('should be defined as a class', () => {
    expect(ComponentService).toBeDefined()
    expect(typeof ComponentService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(ComponentService.prototype.findAll).toBeDefined()
  })



  it('should have findUnmapped method', () => {
    expect(ComponentService.prototype.findUnmapped).toBeDefined()
  })
})
