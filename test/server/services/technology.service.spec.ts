import { describe, it, expect } from 'vitest'
import { TechnologyService } from '../../../server/services/technology.service'

describe('TechnologyService', () => {
  it('should be defined as a class', () => {
    expect(TechnologyService).toBeDefined()
    expect(typeof TechnologyService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(TechnologyService.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(TechnologyService.prototype.findByName).toBeDefined()
  })
})
