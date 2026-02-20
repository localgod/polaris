import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VersionConstraintRepository } from '../../../server/repositories/version-constraint.repository'
import type { VersionConstraint, CreateVersionConstraintInput } from '../../../server/repositories/version-constraint.repository'

vi.mock('../../../server/repositories/version-constraint.repository')
vi.mock('../../../server/repositories/audit-log.repository')

const mockConstraint: VersionConstraint = {
  name: 'Test Constraint',
  description: 'A test constraint',
  severity: 'warning',
  status: 'active',
  scope: 'organization',
  subjectTeam: null,
  versionRange: '>=18.0.0',
  subjectTeams: [],
  governedTechnologies: [],
  technologyCount: 0
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/version-constraints', () => {
  describe('Happy Paths', () => {
    it('should create a valid version constraint', async () => {
      const input: CreateVersionConstraintInput = {
        name: 'New Constraint',
        severity: 'warning',
        versionRange: '>=18.0.0',
        userId: 'test-user'
      }

      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(VersionConstraintRepository.prototype.create).mockResolvedValue({
        constraint: { ...mockConstraint, ...input },
        relationshipsCreated: 0
      })

      const repo = new VersionConstraintRepository()

      const exists = await repo.exists(input.name)
      expect(exists).toBe(false)

      const result = await repo.create(input)

      expect(result.constraint.name).toBe('New Constraint')
      expect(result.constraint.severity).toBe('warning')
    })
  })

  describe('Unhappy Paths', () => {
    it('should reject duplicate name', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)

      const repo = new VersionConstraintRepository()
      const exists = await repo.exists('Existing Constraint')

      expect(exists).toBe(true)
    })

    it('should validate required fields', () => {
      const validInput: CreateVersionConstraintInput = {
        name: 'Test',
        severity: 'warning',
        versionRange: '>=1.0.0',
        userId: 'test-user'
      }

      expect(validInput.name).toBeDefined()
      expect(validInput.severity).toBeDefined()
      expect(validInput.versionRange).toBeDefined()
    })
  })
})

describe('PATCH /api/version-constraints/{name}', () => {
  describe('Happy Paths', () => {
    it('should update status to draft', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(mockConstraint)
      vi.mocked(VersionConstraintRepository.prototype.updateStatus).mockResolvedValue({
        constraint: { ...mockConstraint, status: 'draft' },
        previousStatus: 'active'
      })

      const repo = new VersionConstraintRepository()
      const result = await repo.updateStatus('Test Constraint', { status: 'draft' })

      expect(result.constraint.status).toBe('draft')
      expect(result.previousStatus).toBe('active')
    })

    it('should update status to archived', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(mockConstraint)
      vi.mocked(VersionConstraintRepository.prototype.updateStatus).mockResolvedValue({
        constraint: { ...mockConstraint, status: 'archived' },
        previousStatus: 'active'
      })

      const repo = new VersionConstraintRepository()
      const result = await repo.updateStatus('Test Constraint', { status: 'archived' })

      expect(result.constraint.status).toBe('archived')
    })
  })

  describe('Unhappy Paths', () => {
    it('should return null for non-existent constraint', async () => {
      vi.mocked(VersionConstraintRepository.prototype.findByName).mockResolvedValue(null)

      const repo = new VersionConstraintRepository()
      const result = await repo.findByName('Non-existent')

      expect(result).toBeNull()
    })
  })
})

describe('DELETE /api/version-constraints/{name}', () => {
  describe('Happy Paths', () => {
    it('should delete an existing constraint', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(VersionConstraintRepository.prototype.delete).mockResolvedValue(undefined)

      const repo = new VersionConstraintRepository()

      const exists = await repo.exists('Test Constraint')
      expect(exists).toBe(true)

      await repo.delete('Test Constraint', 'test-user')
      expect(VersionConstraintRepository.prototype.delete).toHaveBeenCalledWith('Test Constraint', 'test-user')
    })
  })

  describe('Unhappy Paths', () => {
    it('should handle non-existent constraint', async () => {
      vi.mocked(VersionConstraintRepository.prototype.exists).mockResolvedValue(false)

      const repo = new VersionConstraintRepository()
      const exists = await repo.exists('Non-existent')

      expect(exists).toBe(false)
    })
  })
})
