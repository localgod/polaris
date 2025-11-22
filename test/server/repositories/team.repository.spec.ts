import { describe, it, expect } from 'vitest'
import { TeamRepository } from '../../../server/repositories/team.repository'

describe('TeamRepository', () => {
  it('should be defined as a class', () => {
    expect(TeamRepository).toBeDefined()
    expect(typeof TeamRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(TeamRepository.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(TeamRepository.prototype.findByName).toBeDefined()
  })

  it('should have exists method', () => {
    expect(TeamRepository.prototype.exists).toBeDefined()
  })

  it('should have countOwnedSystems method', () => {
    expect(TeamRepository.prototype.countOwnedSystems).toBeDefined()
  })

  it('should have delete method', () => {
    expect(TeamRepository.prototype.delete).toBeDefined()
  })
})
