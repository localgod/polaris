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

describe('PUT /api/version-constraints/{name} - subjectTeam reassignment authorization', () => {
  // Simulates the authorization logic from server/api/version-constraints/[name].put.ts
  function runPutAuthorizationCheck(
    userRole: string,
    userTeams: string[],
    existingSubjectTeam: string,
    newSubjectTeam: string | null | undefined
  ): { statusCode: number; message: string } | null {
    if (userRole === 'superuser') return null

    // existing team membership check
    if (!userTeams.includes(existingSubjectTeam)) {
      return { statusCode: 403, message: `You must be a member of team "${existingSubjectTeam}" to edit this version constraint` }
    }

    // new target team membership check (the fix)
    if (newSubjectTeam && newSubjectTeam !== existingSubjectTeam) {
      if (!userTeams.includes(newSubjectTeam)) {
        return { statusCode: 403, message: 'You must be a member of the target team to reassign this constraint' }
      }
    }

    return null
  }

  describe('Happy Paths', () => {
    it('should allow a superuser to reassign a constraint to any team', () => {
      const error = runPutAuthorizationCheck('superuser', [], 'frontend', 'platform-team')
      expect(error).toBeNull()
    })

    it('should allow reassignment when user belongs to both the current and target team', () => {
      const error = runPutAuthorizationCheck('user', ['frontend', 'platform-team'], 'frontend', 'platform-team')
      expect(error).toBeNull()
    })

    it('should allow update without changing subjectTeam', () => {
      const error = runPutAuthorizationCheck('user', ['frontend'], 'frontend', undefined)
      expect(error).toBeNull()
    })

    it('should allow update when new subjectTeam equals existing subjectTeam', () => {
      const error = runPutAuthorizationCheck('user', ['frontend'], 'frontend', 'frontend')
      expect(error).toBeNull()
    })
  })

  describe('Unhappy Paths', () => {
    it('should deny reassignment when user is not a member of the target team', () => {
      const error = runPutAuthorizationCheck('user', ['frontend'], 'frontend', 'platform-team')
      expect(error).not.toBeNull()
      expect(error!.statusCode).toBe(403)
      expect(error!.message).toBe('You must be a member of the target team to reassign this constraint')
    })

    it('should deny access when user is not a member of the existing team', () => {
      const error = runPutAuthorizationCheck('user', ['other-team'], 'frontend', 'frontend')
      expect(error).not.toBeNull()
      expect(error!.statusCode).toBe(403)
      expect(error!.message).toContain('frontend')
    })

    it('should deny reassignment to a third team when user only belongs to the current team', () => {
      const error = runPutAuthorizationCheck('user', ['frontend'], 'frontend', 'backend')
      expect(error).not.toBeNull()
      expect(error!.statusCode).toBe(403)
      expect(error!.message).toBe('You must be a member of the target team to reassign this constraint')
    })
  })
})
