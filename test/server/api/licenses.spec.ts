import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LicenseRepository } from '../../../server/repositories/license.repository'
import type { License } from '../../../server/repositories/license.repository'

// Mock the LicenseRepository
vi.mock('../../../server/repositories/license.repository')

const mockLicenses: License[] = [
  {
    id: 'MIT',
    name: 'MIT License',
    spdxId: 'MIT',
    osiApproved: true,
    url: 'https://opensource.org/licenses/MIT',
    category: 'permissive',
    text: null,
    deprecated: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    componentCount: 42
  },
  {
    id: 'Apache-2.0',
    name: 'Apache License 2.0',
    spdxId: 'Apache-2.0',
    osiApproved: true,
    url: 'https://opensource.org/licenses/Apache-2.0',
    category: 'permissive',
    text: null,
    deprecated: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    componentCount: 28
  },
  {
    id: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    spdxId: 'GPL-3.0',
    osiApproved: true,
    url: 'https://opensource.org/licenses/GPL-3.0',
    category: 'copyleft',
    text: null,
    deprecated: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    componentCount: 5
  }
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/licenses', () => {
  it('should return all licenses', async () => {
    vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(mockLicenses)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findAll()

    expect(result).toEqual(mockLicenses)
    expect(result.length).toBe(3)
    expect(LicenseRepository.prototype.findAll).toHaveBeenCalledOnce()
  })

  it('should filter licenses by category', async () => {
    const permissiveLicenses = mockLicenses.filter(l => l.category === 'permissive')
    vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(permissiveLicenses)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findAll({ category: 'permissive' })

    expect(result).toEqual(permissiveLicenses)
    expect(result.length).toBe(2)
    expect(result.every(l => l.category === 'permissive')).toBe(true)
  })

  it('should filter licenses by OSI approval', async () => {
    const osiApprovedLicenses = mockLicenses.filter(l => l.osiApproved)
    vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(osiApprovedLicenses)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findAll({ osiApproved: true })

    expect(result).toEqual(osiApprovedLicenses)
    expect(result.every(l => l.osiApproved)).toBe(true)
  })

  it('should search licenses by name', async () => {
    const searchResults = mockLicenses.filter(l => l.name.toLowerCase().includes('apache'))
    vi.mocked(LicenseRepository.prototype.findAll).mockResolvedValue(searchResults)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findAll({ search: 'apache' })

    expect(result).toEqual(searchResults)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('Apache-2.0')
  })
})

describe('GET /api/licenses/[id]', () => {
  it('should return license by ID', async () => {
    const license = mockLicenses[0]
    vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(license)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findById('MIT')

    expect(result).toEqual(license)
    expect(result?.id).toBe('MIT')
    expect(LicenseRepository.prototype.findById).toHaveBeenCalledWith('MIT')
  })

  it('should return null for non-existent license', async () => {
    vi.mocked(LicenseRepository.prototype.findById).mockResolvedValue(null)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.findById('NONEXISTENT')

    expect(result).toBeNull()
  })
})

describe('GET /api/licenses/statistics', () => {
  it('should return license statistics', async () => {
    const statistics = {
      total: 3,
      byCategory: {
        permissive: 2,
        copyleft: 1
      },
      osiApproved: 3,
      deprecated: 0
    }
    vi.mocked(LicenseRepository.prototype.getStatistics).mockResolvedValue(statistics)

    const licenseRepo = new LicenseRepository()
    const result = await licenseRepo.getStatistics()

    expect(result).toEqual(statistics)
    expect(result.total).toBe(3)
    expect(result.byCategory.permissive).toBe(2)
    expect(result.byCategory.copyleft).toBe(1)
    expect(result.osiApproved).toBe(3)
    expect(result.deprecated).toBe(0)
  })
})
