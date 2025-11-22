import { describe, it, expect } from 'vitest'
import { SourceRepositoryService } from '../../../server/services/source-repository.service'

describe('SourceRepositoryService', () => {
  it('should be defined as a class', () => {
    expect(SourceRepositoryService).toBeDefined()
    expect(typeof SourceRepositoryService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(SourceRepositoryService.prototype.findAll).toBeDefined()
  })


})
