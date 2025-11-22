import { describe, it, expect } from 'vitest'
import { TeamService } from '../../../server/services/team.service'

describe('TeamService', () => {
  it('should be defined as a class', () => {
    expect(TeamService).toBeDefined()
    expect(typeof TeamService).toBe('function')
  })

  it('should have findAll method', () => {
    expect(TeamService.prototype.findAll).toBeDefined()
  })

  it('should have findByName method', () => {
    expect(TeamService.prototype.findByName).toBeDefined()
  })

  it('should have delete method', () => {
    expect(TeamService.prototype.delete).toBeDefined()
  })
})
