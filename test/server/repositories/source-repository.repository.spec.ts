import { describe, it, expect } from 'vitest'
import { SourceRepositoryRepository } from '../../../server/repositories/source-repository.repository'

describe('SourceRepositoryRepository', () => {
  it('should be defined as a class', () => {
    expect(SourceRepositoryRepository).toBeDefined()
    expect(typeof SourceRepositoryRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(SourceRepositoryRepository.prototype.findAll).toBeDefined()
  })
})
