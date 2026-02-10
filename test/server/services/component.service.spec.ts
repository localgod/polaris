import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'
import { ComponentRepository } from '../../../server/repositories/component.repository'
import type { Component, UnmappedComponent } from '../../../types/api'

vi.mock('../../../server/repositories/component.repository')

describe('ComponentService', () => {
  let service: ComponentService

  const mockComponents: Component[] = [
    {
      name: 'react',
      version: '18.2.0',
      packageManager: 'npm',
      purl: 'pkg:npm/react@18.2.0',
      cpe: null,
      bomRef: null,
      type: 'library',
      group: null,
      scope: 'required',
      hashes: [{ algorithm: 'SHA256', value: 'abc123' }],
      licenses: [{ id: 'MIT', name: 'MIT License', url: null, text: null }],
      copyright: null,
      supplier: null,
      author: null,
      publisher: null,
      homepage: 'https://reactjs.org',
      externalReferences: [],
      description: 'React is a JavaScript library for building user interfaces',
      releaseDate: null,
      publishedDate: null,
      modifiedDate: null,
      technologyName: 'React',
      systemCount: 5
    },
    {
      name: 'vue',
      version: '3.3.4',
      packageManager: 'npm',
      purl: 'pkg:npm/vue@3.3.4',
      cpe: null,
      bomRef: null,
      type: 'library',
      group: null,
      scope: 'required',
      hashes: [{ algorithm: 'SHA256', value: 'def456' }],
      licenses: [{ id: 'MIT', name: 'MIT License', url: null, text: null }],
      copyright: null,
      supplier: null,
      author: null,
      publisher: null,
      homepage: 'https://vuejs.org',
      externalReferences: [],
      description: 'The Progressive JavaScript Framework',
      releaseDate: null,
      publishedDate: null,
      modifiedDate: null,
      technologyName: 'Vue',
      systemCount: 3
    }
  ]

  const mockUnmappedComponents: UnmappedComponent[] = [
    {
      name: 'internal-lib',
      version: '1.0.0',
      packageManager: 'npm',
      purl: 'pkg:npm/internal-lib@1.0.0',
      cpe: null,
      type: 'library',
      group: null,
      hashes: [],
      licenses: [],
      systems: ['system-a', 'system-b'],
      systemCount: 2
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ComponentService()
  })

  describe('findAll()', () => {
    it('should return all components with correct count', async () => {
      vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue(mockComponents)

      const result = await service.findAll()

      expect(ComponentRepository.prototype.findAll).toHaveBeenCalledOnce()
      expect(result).toEqual({
        data: mockComponents,
        count: 2
      })
    })

    it('should return empty array when no components exist', async () => {
      vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue([])

      const result = await service.findAll()

      expect(result).toEqual({ data: [], count: 0 })
    })

    it('should calculate count correctly for single component', async () => {
      vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue([mockComponents[0]])

      const result = await service.findAll()

      expect(result.count).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('should propagate repository errors', async () => {
      vi.mocked(ComponentRepository.prototype.findAll).mockRejectedValue(new Error('Database connection failed'))

      await expect(service.findAll()).rejects.toThrow('Database connection failed')
      expect(ComponentRepository.prototype.findAll).toHaveBeenCalledOnce()
    })

    it('should return components with all required properties', async () => {
      vi.mocked(ComponentRepository.prototype.findAll).mockResolvedValue(mockComponents)

      const result = await service.findAll()

      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('version')
      expect(result.data[0]).toHaveProperty('packageManager')
      expect(result.data[0]).toHaveProperty('purl')
      expect(result.data[0]).toHaveProperty('type')
      expect(result.data[0]).toHaveProperty('hashes')
      expect(result.data[0]).toHaveProperty('licenses')
    })
  })

  describe('findUnmapped()', () => {
    it('should return all unmapped components with correct count', async () => {
      vi.mocked(ComponentRepository.prototype.findUnmapped).mockResolvedValue(mockUnmappedComponents)

      const result = await service.findUnmapped()

      expect(ComponentRepository.prototype.findUnmapped).toHaveBeenCalledOnce()
      expect(result).toEqual({
        data: mockUnmappedComponents,
        count: 1
      })
    })

    it('should return empty array when no unmapped components exist', async () => {
      vi.mocked(ComponentRepository.prototype.findUnmapped).mockResolvedValue([])

      const result = await service.findUnmapped()

      expect(result).toEqual({ data: [], count: 0 })
    })

    it('should propagate repository errors', async () => {
      vi.mocked(ComponentRepository.prototype.findUnmapped).mockRejectedValue(new Error('Query execution failed'))

      await expect(service.findUnmapped()).rejects.toThrow('Query execution failed')
      expect(ComponentRepository.prototype.findUnmapped).toHaveBeenCalledOnce()
    })
  })
})
