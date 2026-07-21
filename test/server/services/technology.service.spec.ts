import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechnologyService } from '../../../server/services/technology.service'
import { TechnologyRepository } from '../../../server/repositories/technology.repository'
import { SBOMRepository } from '../../../server/repositories/sbom.repository'
import type { TechnologyDetail } from '../../../server/repositories/technology.repository'
import '../../fixtures/service-test-helper'

vi.mock('../../../server/repositories/technology.repository')
vi.mock('../../../server/repositories/sbom.repository')

const mockTech: TechnologyDetail = {
  name: 'React', type: 'framework', domain: 'framework', vendor: 'Meta',
  lastReviewed: null, ownerTeamName: null, componentCount: 0, versions: [], approvals: []
}

describe('TechnologyService', () => {
  let service: TechnologyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TechnologyService()
  })

  describe('[pin] findAll()', () => {
    it('should return technologies with count', async () => {
      vi.mocked(TechnologyRepository.prototype.findAll).mockResolvedValue({ data: [mockTech], total: 1 })

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('React')
      expect(result.count).toBe(1)
      expect(result.total).toBe(1)
      expect(TechnologyRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should return empty result when none exist', async () => {
      vi.mocked(TechnologyRepository.prototype.findAll).mockResolvedValue({ data: [], total: 0 })

      const result = await service.findAll()

      expect(result.data).toEqual([])
      expect(result.count).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  describe('[pin] findByName()', () => {
    it('should return technology when found', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(mockTech)

      const result = await service.findByName('React')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('React')
    })

    it('should return null when not found', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(null)

      expect(await service.findByName('nonexistent')).toBeNull()
    })

    it('should propagate repository errors', async () => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockRejectedValue(new Error('DB error'))

      await expect(service.findByName('React')).rejects.toThrow('DB error')
    })

    it('should enrich technology versions with read-through lifecycle data', async () => {
      const eol = {
        status: 'unsupported' as const,
        productName: 'nodejs',
        productLabel: 'Node.js',
        matchedCycle: '16',
        eolDate: '2023-09-11',
        supportEndDate: null,
        daysUntilEOL: null,
        daysSinceEOL: 1000,
        lts: true,
        latestVersion: '24.16.0',
        latestReleaseDate: null,
        source: { name: 'endoflife.date' as const, url: 'https://endoflife.date/nodejs' }
      }
      const repo = {
        findByName: vi.fn(async () => ({
          ...mockTech,
          name: 'Node.js',
          versions: [
            { version: '16.20.2', releaseDate: null, eolDate: '2024-01-01', approved: true, notes: null }
          ]
        }))
      }
      const eolService = { getEOLStatus: vi.fn(async () => eol) }
      const enrichedService = new TechnologyService(repo as never, eolService as never)

      const result = await enrichedService.findByName('Node.js')

      expect(eolService.getEOLStatus).toHaveBeenCalledWith({
        name: 'Node.js',
        version: '16.20.2',
        technologyName: 'Node.js'
      })
      expect(result?.versionLifecycles).toEqual([
        { version: '16.20.2', storedEolDate: '2024-01-01', lifecycle: eol }
      ])
      expect(result?.lifecycleSummary).toMatchObject({
        status: 'unsupported',
        unsupportedCount: 1
      })
    })
  })

  describe('[contract] createFromComponent() — a Technology always requires a Component', () => {
    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(false)
      vi.mocked(TechnologyRepository.prototype.createFromComponent).mockResolvedValue('React')
    })

    it('should reject when componentName is missing', async () => {
      await expect(service.createFromComponent({ name: 'React', type: 'framework', componentName: '', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 400 })
      expect(TechnologyRepository.prototype.createFromComponent).not.toHaveBeenCalled()
    })

    it('should reject when componentName is whitespace-only', async () => {
      await expect(service.createFromComponent({ name: 'React', type: 'framework', componentName: '   ', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 400 })
      expect(TechnologyRepository.prototype.createFromComponent).not.toHaveBeenCalled()
    })

    it('should propagate a 404 when the repository finds no unlinked matching component', async () => {
      vi.mocked(TechnologyRepository.prototype.createFromComponent).mockRejectedValue(
        Object.assign(new Error("No unlinked component named 'react' found"), { statusCode: 404 })
      )

      await expect(service.createFromComponent({ name: 'React', type: 'framework', componentName: 'react', userId: 'u1' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('should pass a provided string value through unchanged', async () => {
      await service.createFromComponent({ name: 'React', type: 'framework', vendor: 'Meta', componentName: 'react', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.createFromComponent).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
      expect(params.componentName).toBe('react')
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.createFromComponent({ name: 'React', type: 'framework', componentName: 'react', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.createFromComponent).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce empty string optional fields to null', async () => {
      await service.createFromComponent({ name: 'React', type: 'framework', domain: '', vendor: '', ownerTeam: '', componentName: 'react', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.createFromComponent).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce whitespace-only optional fields to null', async () => {
      await service.createFromComponent({ name: 'React', type: 'framework', vendor: '  ', ownerTeam: '  ', componentName: 'react', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.createFromComponent).mock.calls[0][0]
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should trim whitespace from optional fields and componentName', async () => {
      await service.createFromComponent({ name: 'React', type: 'framework', vendor: '  Meta  ', componentName: '  react  ', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.createFromComponent).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
      expect(params.componentName).toBe('react')
    })
  })

  describe('[contract] setApproval()', () => {
    const baseInput = {
      technologyName: 'React',
      teamName: 'Platform Team',
      time: 'invest',
      userId: 'u1'
    }

    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(TechnologyRepository.prototype.findExistingApproval).mockResolvedValue(null)
      vi.mocked(TechnologyRepository.prototype.upsertApproval).mockResolvedValue({ time: 'invest', team: 'Platform Team' })
    })

    it('should pass environment=null for a blanket approval', async () => {
      await service.setApproval(baseInput)

      expect(TechnologyRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ environment: null })
      )
    })

    it('should pass environment when provided', async () => {
      await service.setApproval({ ...baseInput, environment: 'prod' })

      expect(TechnologyRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'prod' })
      )
      expect(TechnologyRepository.prototype.findExistingApproval).toHaveBeenCalledWith('React', 'Platform Team', 'prod')
    })

    it('should reject an invalid environment value', async () => {
      await expect(service.setApproval({ ...baseInput, environment: 'production' }))
        .rejects.toMatchObject({ statusCode: 422 })
    })

    it('should reject an invalid TIME value', async () => {
      await expect(service.setApproval({ ...baseInput, time: 'adopt' }))
        .rejects.toMatchObject({ statusCode: 422 })
    })

    it('should look up existing approval scoped to the same environment', async () => {
      vi.mocked(TechnologyRepository.prototype.findExistingApproval).mockResolvedValue({ time: 'tolerate', notes: null })

      await service.setApproval({ ...baseInput, environment: 'staging' })

      expect(TechnologyRepository.prototype.findExistingApproval).toHaveBeenCalledWith('React', 'Platform Team', 'staging')
    })

    it('should include team name and environment in the audit changes, not just entityId', async () => {
      await service.setApproval({ ...baseInput, environment: 'prod' })

      const params = vi.mocked(TechnologyRepository.prototype.upsertApproval).mock.calls[0][0]
      expect(params.changes.team).toEqual({ before: 'Platform Team', after: 'Platform Team' })
      expect(params.changes.environment).toEqual({ before: 'prod', after: 'prod' })
    })

    it('should pass correlationId through to the repository', async () => {
      await service.setApproval({ ...baseInput, correlationId: 'corr-1' })

      expect(TechnologyRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'corr-1' })
      )
    })

    it('should default correlationId to null when not provided', async () => {
      await service.setApproval(baseInput)

      expect(TechnologyRepository.prototype.upsertApproval).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: null })
      )
    })
  })

  describe('[pin] update() — optional field coercion', () => {
    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.findByName).mockResolvedValue(mockTech)
      vi.mocked(TechnologyRepository.prototype.update).mockResolvedValue('React')
    })

    it('should coerce empty string optional fields to null', async () => {
      await service.update({ name: 'React', type: 'framework', domain: '', vendor: '', ownerTeam: '', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
      expect(params.ownerTeam).toBeNull()
    })

    it('should coerce undefined optional fields to null', async () => {
      await service.update({ name: 'React', type: 'framework', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.domain).toBeNull()
      expect(params.vendor).toBeNull()
    })

    it('should trim whitespace from optional fields that have real content', async () => {
      await service.update({ name: 'React', type: 'framework', vendor: '  Meta  ', userId: 'u1' })

      const params = vi.mocked(TechnologyRepository.prototype.update).mock.calls[0][0]
      expect(params.vendor).toBe('Meta')
    })
  })

  describe('[contract] findForRadar()', () => {
    const mockRows = [
      { name: 'React',   type: 'framework', domain: 'framework',    approvals: [{ team: 'A', time: 'invest' }, { team: 'B', time: 'invest' }] },
      { name: 'Angular', type: 'framework', domain: 'framework',    approvals: [{ team: 'A', time: 'migrate' }, { team: 'B', time: 'invest' }] },
      { name: 'Vue',     type: 'framework', domain: 'framework',    approvals: [{ team: 'A', time: 'eliminate' }, { team: 'B', time: 'migrate' }, { team: 'C', time: 'migrate' }] },
      { name: 'Svelte',  type: 'framework', domain: 'developer-tooling', approvals: [] },
    ]

    beforeEach(() => {
      vi.mocked(TechnologyRepository.prototype.findForRadar).mockResolvedValue(mockRows)
    })

    it('returns all technologies with unclassified for no approvals', async () => {
      const result = await service.findForRadar()
      const svelte = result.find(r => r.name === 'Svelte')
      expect(svelte?.timeValue).toBe('unclassified')
      expect(svelte?.approvalCount).toBe(0)
    })

    it('uses majority vote when no team filter', async () => {
      const result = await service.findForRadar()
      // React: 2x invest → invest
      expect(result.find(r => r.name === 'React')?.timeValue).toBe('invest')
    })

    it('breaks ties by severity (eliminate > migrate > tolerate > invest)', async () => {
      const result = await service.findForRadar()
      // Angular: 1x migrate, 1x invest → tie → migrate wins (more severe)
      expect(result.find(r => r.name === 'Angular')?.timeValue).toBe('migrate')
      // Vue: 1x eliminate, 2x migrate → migrate wins (majority)
      expect(result.find(r => r.name === 'Vue')?.timeValue).toBe('migrate')
    })

    it('filters by team when team param provided', async () => {
      const result = await service.findForRadar('A')
      expect(result.find(r => r.name === 'React')?.timeValue).toBe('invest')
      expect(result.find(r => r.name === 'Angular')?.timeValue).toBe('migrate')
      expect(result.find(r => r.name === 'Vue')?.timeValue).toBe('eliminate')
    })

    it('marks unclassified when team has no approval for a technology', async () => {
      const result = await service.findForRadar('Z')
      expect(result.every(r => r.timeValue === 'unclassified')).toBe(true)
    })

    it('includes approvalCount', async () => {
      const result = await service.findForRadar()
      expect(result.find(r => r.name === 'React')?.approvalCount).toBe(2)
      expect(result.find(r => r.name === 'Svelte')?.approvalCount).toBe(0)
    })
  })

  describe('[pin] linkComponentByPurl()', () => {
    const input = { technologyName: 'React', purl: 'pkg:npm/react@18.2.0', userId: 'user-1', realUserId: null }

    it('should link component by purl and refresh affected systems', async () => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(TechnologyRepository.prototype.linkComponentByPurl).mockResolvedValue({
        technologyName: 'React', name: 'react', purl: 'pkg:npm/react@18.2.0',
        affectedSystems: ['my-service', 'other-service']
      })
      vi.mocked(SBOMRepository.prototype.upsertTeamUsesTechnology).mockResolvedValue(undefined)

      const result = await service.linkComponentByPurl(input)

      expect(result).toEqual({ technologyName: 'React', name: 'react', purl: 'pkg:npm/react@18.2.0' })
      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).toHaveBeenCalledTimes(2)
      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).toHaveBeenCalledWith('my-service')
      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).toHaveBeenCalledWith('other-service')
    })

    it('should not call upsertTeamUsesTechnology when no systems use the component', async () => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(true)
      vi.mocked(TechnologyRepository.prototype.linkComponentByPurl).mockResolvedValue({
        technologyName: 'React', name: 'react', purl: 'pkg:npm/react@18.2.0', affectedSystems: []
      })
      vi.mocked(SBOMRepository.prototype.upsertTeamUsesTechnology).mockResolvedValue(undefined)

      await service.linkComponentByPurl(input)

      expect(SBOMRepository.prototype.upsertTeamUsesTechnology).not.toHaveBeenCalled()
    })

    it('should throw 404 when technology does not exist', async () => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(false)

      await expect(service.linkComponentByPurl(input)).rejects.toMatchObject({ statusCode: 404 })
      expect(TechnologyRepository.prototype.linkComponentByPurl).not.toHaveBeenCalled()
    })

    it('should propagate 404 when component purl is not found', async () => {
      vi.mocked(TechnologyRepository.prototype.exists).mockResolvedValue(true)
      const notFound = Object.assign(new Error('Component not found'), { statusCode: 404 })
      vi.mocked(TechnologyRepository.prototype.linkComponentByPurl).mockRejectedValue(notFound)

      await expect(service.linkComponentByPurl(input)).rejects.toMatchObject({ statusCode: 404 })
    })
  })
})
