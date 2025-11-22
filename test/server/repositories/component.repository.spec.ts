import { describe, it, expect } from 'vitest'
import { ComponentRepository } from '../../../server/repositories/component.repository'

describe('ComponentRepository', () => {
  it('should be defined as a class', () => {
    expect(ComponentRepository).toBeDefined()
    expect(typeof ComponentRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(ComponentRepository.prototype.findAll).toBeDefined()
  })

  it('should have findUnmapped method', () => {
    expect(ComponentRepository.prototype.findUnmapped).toBeDefined()
  })
})
