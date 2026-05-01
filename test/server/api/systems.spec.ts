import { expect, vi, beforeAll } from 'vitest'
import { createError } from 'h3'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { mockEvent } from '../../fixtures/h3-event'
import getHandler from '../../../server/api/systems.get'
import postHandler from '../../../server/api/systems.post'
import { systemService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  systemService: { findAll: vi.fn(), create: vi.fn() }
}))

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const mockSystem = {
  name: 'polaris-api',
  domain: 'Platform',
  ownerTeam: 'Platform Team',
  businessCriticality: 'high' as const,
  environment: 'prod' as const,
  componentCount: 10,
  repositoryCount: 2
}

const mockUser = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }

const validBody = {
  name: 'new-system',
  domain: 'Platform',
  ownerTeam: 'Platform Team',
  businessCriticality: 'high',
  environment: 'prod'
}

const feature = await loadFeature('./test/server/api/systems.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let getResult: Awaited<ReturnType<typeof getHandler>>
  let postResult: Awaited<ReturnType<typeof postHandler>>
  let caughtError: unknown

  Background(({ Given }) => {
    Given('the API server is running', () => {
      vi.clearAllMocks()
      mockGetImpersonatorId.mockResolvedValue(null)
    })
  })

  Scenario('Successfully retrieve all systems', ({ When, Then, And }) => {
    When('I request GET "/api/systems"', async () => {
      vi.mocked(systemService.findAll).mockResolvedValue({ data: [mockSystem], count: 1, total: 1 })
      getResult = await getHandler(mockEvent())
    })
    Then('the response should be successful', () => { expect(getResult.success).toBe(true) })
    And('the response data should be an array', () => { expect(Array.isArray(getResult.data)).toBe(true) })
    And('the response should include a total count', () => { expect(getResult.total).toBe(1) })
  })

  Scenario('Pagination defaults to limit 50 and offset 0', ({ When, Then }) => {
    When('I request GET "/api/systems"', async () => {
      vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent())
    })
    Then('the service should be called with limit 50 and offset 0', () => {
      expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 50, 0)
    })
  })

  Scenario('Limit is clamped to a maximum of 200', ({ When, Then }) => {
    When('I request GET "/api/systems" with limit 9999', async () => {
      vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent({ query: { limit: '9999' } }))
    })
    Then('the service should be called with limit 200 and offset 0', () => {
      expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 200, 0)
    })
  })

  Scenario('Limit is clamped to a minimum of 1', ({ When, Then }) => {
    When('I request GET "/api/systems" with limit 0', async () => {
      vi.mocked(systemService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent({ query: { limit: '0' } }))
    })
    Then('the service should be called with limit 1 and offset 0', () => {
      expect(systemService.findAll).toHaveBeenCalledWith(expect.any(Object), 1, 0)
    })
  })

  Scenario('Non-integer limit is rejected', ({ When, Then, And }) => {
    When('I request GET "/api/systems" with limit "abc"', async () => {
      getResult = await getHandler(mockEvent({ query: { limit: 'abc' } }))
    })
    Then('the response should be unsuccessful', () => { expect(getResult.success).toBe(false) })
    And('the response error should mention integers', () => { expect(getResult.error).toMatch(/integer/) })
  })

  Scenario('Service error returns error response', ({ When, Then, And }) => {
    When('I request GET "/api/systems" and the service throws an error "DB down"', async () => {
      vi.mocked(systemService.findAll).mockRejectedValue(new Error('DB down'))
      getResult = await getHandler(mockEvent())
    })
    Then('the response should be unsuccessful', () => { expect(getResult.success).toBe(false) })
    And('the response error should be "DB down"', () => { expect(getResult.error).toBe('DB down') })
  })

  Scenario('Successfully create a new system', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/systems" with valid system data', async () => {
      vi.mocked(systemService.create).mockResolvedValue('new-system')
      postResult = await postHandler(mockEvent({ method: 'POST', body: validBody }))
    })
    Then('the response should be successful', () => { expect(postResult.success).toBe(true) })
    And('the response data should contain the created system name', () => {
      expect(postResult.data).toEqual([{ name: 'new-system' }])
    })
  })

  Scenario('Unauthenticated request is rejected', ({ Given, When, Then }) => {
    Given('I am not authenticated', () => {
      mockRequireAuth.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))
    })
    When('I request POST "/api/systems" with valid system data', async () => {
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 401', () => {
      expect(caughtError).toMatchObject({ statusCode: 401 })
    })
  })

  Scenario('Conflict returns 409', ({ Given, When, Then }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/systems" with a duplicate system name', async () => {
      vi.mocked(systemService.create).mockRejectedValue(
        createError({ statusCode: 409, message: 'System already exists' })
      )
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 409', () => {
      expect(caughtError).toMatchObject({ statusCode: 409 })
    })
  })

  Scenario('Unexpected service error returns 500', ({ Given, When, Then }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/systems" and the service throws an unexpected error', async () => {
      vi.mocked(systemService.create).mockRejectedValue(new Error('unexpected'))
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 500', () => {
      expect(caughtError).toMatchObject({ statusCode: 500 })
    })
  })
})
