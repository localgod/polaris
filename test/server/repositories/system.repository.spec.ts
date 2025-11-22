import { describe, it, expect } from 'vitest'
import { SystemRepository } from '../../../server/repositories/system.repository'

describe('SystemRepository', () => {
  it('should be defined as a class', () => {
    expect(SystemRepository).toBeDefined()
    expect(typeof SystemRepository).toBe('function')
  })

  it('should have findAll method', () => {
    expect(SystemRepository.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(SystemRepository.prototype.findByName).toBeDefined()
  })

  it('should have exists method', () => {
    expect(SystemRepository.prototype.exists).toBeDefined()
  })

  it('should have create method', () => {
    expect(SystemRepository.prototype.create).toBeDefined()
  })

  it('should have delete method', () => {
    expect(SystemRepository.prototype.delete).toBeDefined()
  })
})
