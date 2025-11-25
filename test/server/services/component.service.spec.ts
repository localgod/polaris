import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComponentService } from '../../../server/services/component.service'
import type { ComponentRepository } from '../../../server/repositories/component.repository'
import type { Component, UnmappedComponent } from '../../../types/api'

// Mock the ComponentRepository
vi.mock('../../../server/repositories/component.repository')

describe('ComponentService', () => {
  let componentService: ComponentService
  let mockComponentRepo: ComponentRepository

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
      systemCount: 5,
      vulnerabilityCount: 0
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
      systemCount: 3,
      vulnerabilityCount: 0
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
    componentService = new ComponentService()
    mockComponentRepo = componentService['componentRepo']
  })

  describe('Class Definition', () => {
    it('should be defined as a class', () => {
      expect(ComponentService).toBeDefined()
      expect(typeof ComponentService).toBe('function')
    })

    it('should have findAll method', () => {
      expect(ComponentService.prototype.findAll).toBeDefined()
    })

    it('should have findUnmapped method', () => {
      expect(ComponentService.prototype.findUnmapped).toBeDefined()
    })
  })

  describe('findAll()', () => {
    it('should return all components with correct count', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)

      // Act
      const result = await componentService.findAll()

      // Assert
      expect(mockComponentRepo.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: mockComponents,
        count: 2
      })
    })

    it('should return empty array when no components exist', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue([])

      // Act
      const result = await componentService.findAll()

      // Assert
      expect(mockComponentRepo.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: [],
        count: 0
      })
    })

    it('should calculate count correctly for single component', async () => {
      // Arrange
      const singleComponent = [mockComponents[0]]
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue(singleComponent)

      // Act
      const result = await componentService.findAll()

      // Assert
      expect(result.count).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(mockComponentRepo.findAll).mockRejectedValue(error)

      // Act & Assert
      await expect(componentService.findAll()).rejects.toThrow('Database connection failed')
      expect(mockComponentRepo.findAll).toHaveBeenCalledTimes(1)
    })

    it('should return components with all required properties', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findAll).mockResolvedValue(mockComponents)

      // Act
      const result = await componentService.findAll()

      // Assert
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
      // Arrange
      vi.mocked(mockComponentRepo.findUnmapped).mockResolvedValue(mockUnmappedComponents)

      // Act
      const result = await componentService.findUnmapped()

      // Assert
      expect(mockComponentRepo.findUnmapped).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: mockUnmappedComponents,
        count: 1
      })
    })

    it('should return empty array when no unmapped components exist', async () => {
      // Arrange
      vi.mocked(mockComponentRepo.findUnmapped).mockResolvedValue([])

      // Act
      const result = await componentService.findUnmapped()

      // Assert
      expect(mockComponentRepo.findUnmapped).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        data: [],
        count: 0
      })
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Query execution failed')
      vi.mocked(mockComponentRepo.findUnmapped).mockRejectedValue(error)

      // Act & Assert
      await expect(componentService.findUnmapped()).rejects.toThrow('Query execution failed')
      expect(mockComponentRepo.findUnmapped).toHaveBeenCalledTimes(1)
    })
  })
})
