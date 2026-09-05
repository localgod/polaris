import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WaiverService } from '../../../server/services/waiver.service'
import { WaiverRepository } from '../../../server/repositories/waiver.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/waiver.repository')

describe('WaiverService', () => {
  let service: WaiverService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WaiverService()
  })

  describe('[contract] resolveOwningTeam()', () => {
    it('resolves compliance violations via the persisted ComplianceViolation node, not the caller-supplied teamName', async () => {
      vi.mocked(WaiverRepository.prototype.findOwningTeamForCompliance).mockResolvedValue('Platform')

      const result = await service.resolveOwningTeam('compliance', { teamName: 'Platform', technologyName: 'jQuery' })

      expect(result).toBe('Platform')
      expect(WaiverRepository.prototype.findOwningTeamForCompliance).toHaveBeenCalledWith('Platform', 'jQuery')
    })

    it('returns null for a compliance naturalKey with no matching violation, even though the caller supplied a teamName (regression for #880)', async () => {
      vi.mocked(WaiverRepository.prototype.findOwningTeamForCompliance).mockResolvedValue(null)

      const result = await service.resolveOwningTeam('compliance', { teamName: 'Platform', technologyName: 'never-seen-tech' })

      expect(result).toBeNull()
    })

    it('resolves via System-OWNS lookup for license violations', async () => {
      vi.mocked(WaiverRepository.prototype.findOwningTeamForSystem).mockResolvedValue('Platform')

      const result = await service.resolveOwningTeam('license', { systemName: 'checkout', componentPurl: 'pkg:npm/left-pad@1.0.0', licenseId: 'gpl-3.0' })

      expect(result).toBe('Platform')
      expect(WaiverRepository.prototype.findOwningTeamForSystem).toHaveBeenCalledWith('checkout')
    })
  })

  describe('[contract] create()', () => {
    const validInput = {
      violationType: 'compliance' as const,
      naturalKey: { teamName: 'Platform', technologyName: 'jQuery' },
      reason: '  accepted for Q3  ',
      expiresAt: '2099-01-01T00:00:00.000Z',
      createdBy: 'user-1'
    }

    it('rejects an invalid violationType', async () => {
      await expect(service.create({ ...validInput, violationType: 'bogus' as never }))
        .rejects.toMatchObject({ statusCode: 400 })
      expect(WaiverRepository.prototype.create).not.toHaveBeenCalled()
    })

    it('rejects a missing reason', async () => {
      await expect(service.create({ ...validInput, reason: '   ' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects a missing expiresAt', async () => {
      await expect(service.create({ ...validInput, expiresAt: '' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects an expiresAt in the past', async () => {
      await expect(service.create({ ...validInput, expiresAt: '2020-01-01T00:00:00.000Z' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects an incomplete naturalKey for the given violationType', async () => {
      await expect(service.create({ ...validInput, naturalKey: { teamName: 'Platform' } as never }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('trims the reason and delegates to the repository', async () => {
      vi.mocked(WaiverRepository.prototype.create).mockResolvedValue({
        id: 'waiver-1', reason: 'accepted for Q3', createdBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z'
      })

      const result = await service.create(validInput)

      expect(result.id).toBe('waiver-1')
      expect(WaiverRepository.prototype.create).toHaveBeenCalledWith(
        'compliance',
        { teamName: 'Platform', technologyName: 'jQuery' },
        expect.objectContaining({ reason: 'accepted for Q3', expiresAt: validInput.expiresAt, createdBy: 'user-1' })
      )
    })
  })

  describe('[contract] revoke()', () => {
    it('throws 404 when the waiver does not exist', async () => {
      vi.mocked(WaiverRepository.prototype.findForRevoke).mockResolvedValue(null)

      await expect(service.revoke('nonexistent', 'user-1')).rejects.toMatchObject({ statusCode: 404 })
      expect(WaiverRepository.prototype.revoke).not.toHaveBeenCalled()
    })

    it('throws 409 when the waiver is already revoked', async () => {
      vi.mocked(WaiverRepository.prototype.findForRevoke).mockResolvedValue({
        id: 'waiver-1', revokedAt: '2026-01-01T00:00:00.000Z', violationType: 'ComplianceViolation', teamName: 'Platform'
      })

      await expect(service.revoke('waiver-1', 'user-1')).rejects.toMatchObject({ statusCode: 409 })
      expect(WaiverRepository.prototype.revoke).not.toHaveBeenCalled()
    })

    it('revokes an active waiver', async () => {
      vi.mocked(WaiverRepository.prototype.findForRevoke).mockResolvedValue({
        id: 'waiver-1', revokedAt: null, violationType: 'ComplianceViolation', teamName: 'Platform'
      })

      await service.revoke('waiver-1', 'user-1', 'admin-1')

      expect(WaiverRepository.prototype.revoke).toHaveBeenCalledWith('waiver-1', 'user-1', 'admin-1')
    })
  })
})
