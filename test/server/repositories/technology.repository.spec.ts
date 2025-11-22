import { describe, it, expect } from 'vitest'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'

describe('TechnologyRepository', () => {
  it('should be defined as a class', () => {
    expect(TechnologyRepository).toBeDefined()
    expect(typeof TechnologyRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(TechnologyRepository.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(TechnologyRepository.prototype.findByName).toBeDefined()
  })


})
