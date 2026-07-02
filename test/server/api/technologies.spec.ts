import { expect, vi, beforeAll } from 'vitest'
import { createError } from 'h3'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { mockEvent } from '../../fixtures/h3-event'
import getHandler from '../../../server/api/technologies.get'
import postHandler from '../../../server/api/technologies.post'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: { findAll: vi.fn(), createFromComponent: vi.fn() }
}))

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const mockTech = {
  name: 'React', type: 'library', domain: 'framework', vendor: null,
  lastReviewed: null, ownerTeamName: null, componentCount: 0,
  constraintCount: 0, versions: [], approvals: []
}

const mockUser = { id: 'user-1', email: 'user@example.com', role: 'user' as const, teams: [] }
const validBody = { name: 'React', type: 'library', componentName: 'react' }

const feature = await loadFeature('./test/server/api/technologies.feature')

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

  Scenario('Successfully retrieve all technologies', ({ When, Then, And }) => {
    When('I request GET "/api/technologies"', async () => {
      vi.mocked(technologyService.findAll).mockResolvedValue({ data: [mockTech], count: 1, total: 1 })
      getResult = await getHandler(mockEvent())
    })
    Then('the response should be successful', () => { expect(getResult.success).toBe(true) })
    And('the response data should be an array', () => { expect(Array.isArray(getResult.data)).toBe(true) })
    And('the response should include a total count', () => { expect(getResult.total).toBe(1) })
  })

  Scenario('Pagination defaults to limit 50 and offset 0', ({ When, Then }) => {
    When('I request GET "/api/technologies"', async () => {
      vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent())
    })
    Then('the service should be called with limit 50 and offset 0', () => {
      expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 50, 0, undefined)
    })
  })

  Scenario('Limit is clamped to a maximum of 200', ({ When, Then }) => {
    When('I request GET "/api/technologies" with limit 500', async () => {
      vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent({ query: { limit: '500' } }))
    })
    Then('the service should be called with limit 200 and offset 0', () => {
      expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 200, 0, undefined)
    })
  })

  Scenario('Limit is clamped to a minimum of 1', ({ When, Then }) => {
    When('I request GET "/api/technologies" with limit -5', async () => {
      vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent({ query: { limit: '-5' } }))
    })
    Then('the service should be called with limit 1 and offset 0', () => {
      expect(technologyService.findAll).toHaveBeenCalledWith(expect.any(Object), 1, 0, undefined)
    })
  })

  Scenario('Non-integer limit is rejected', ({ When, Then, And }) => {
    When('I request GET "/api/technologies" with limit "bad"', async () => {
      getResult = await getHandler(mockEvent({ query: { limit: 'bad' } }))
    })
    Then('the response should be unsuccessful', () => { expect(getResult.success).toBe(false) })
    And('the response error should mention integers', () => { expect(getResult.error).toMatch(/integer/) })
  })

  Scenario('Sort parameters are forwarded to the service', ({ When, Then }) => {
    When('I request GET "/api/technologies" with sortBy "name" and sortOrder "desc"', async () => {
      vi.mocked(technologyService.findAll).mockResolvedValue({ data: [], count: 0, total: 0 })
      getResult = await getHandler(mockEvent({ query: { sortBy: 'name', sortOrder: 'desc' } }))
    })
    Then('the service should be called with sortBy "name" and sortOrder "desc"', () => {
      expect(technologyService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'name', sortOrder: 'desc' }), 50, 0, undefined
      )
    })
  })

  Scenario('Service error returns error response', ({ When, Then, And }) => {
    When('I request GET "/api/technologies" and the service throws an error "DB error"', async () => {
      vi.mocked(technologyService.findAll).mockRejectedValue(new Error('DB error'))
      getResult = await getHandler(mockEvent())
    })
    Then('the response should be unsuccessful', () => { expect(getResult.success).toBe(false) })
    And('the response error should be "DB error"', () => { expect(getResult.error).toBe('DB error') })
  })

  Scenario('Successfully create a new technology', ({ Given, When, Then, And }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/technologies" with valid technology data', async () => {
      vi.mocked(technologyService.createFromComponent).mockResolvedValue('React')
      postResult = await postHandler(mockEvent({ method: 'POST', body: validBody }))
    })
    Then('the response should be successful', () => { expect(postResult.success).toBe(true) })
    And('the response data should contain the created technology name', () => {
      expect(postResult.data).toEqual([{ name: 'React' }])
    })
  })

  Scenario('Unauthenticated request is rejected', ({ Given, When, Then }) => {
    Given('I am not authenticated', () => {
      mockRequireAuth.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))
    })
    When('I request POST "/api/technologies" with valid technology data', async () => {
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 401', () => {
      expect(caughtError).toMatchObject({ statusCode: 401 })
    })
  })

  Scenario('Conflict returns 409', ({ Given, When, Then }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/technologies" with a duplicate technology name', async () => {
      vi.mocked(technologyService.createFromComponent).mockRejectedValue(
        createError({ statusCode: 409, message: 'Technology already exists' })
      )
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 409', () => {
      expect(caughtError).toMatchObject({ statusCode: 409 })
    })
  })

  Scenario('Unexpected service error returns 500', ({ Given, When, Then }) => {
    Given('I am authenticated', () => { mockRequireAuth.mockResolvedValue(mockUser) })
    When('I request POST "/api/technologies" and the service throws an unexpected error', async () => {
      vi.mocked(technologyService.createFromComponent).mockRejectedValue(new Error('unexpected'))
      caughtError = await postHandler(mockEvent({ method: 'POST', body: validBody })).catch(e => e)
    })
    Then('the request should be rejected with status 500', () => {
      expect(caughtError).toMatchObject({ statusCode: 500 })
    })
  })
})
