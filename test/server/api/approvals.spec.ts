import { expect, vi, beforeAll } from 'vitest'
import { createError } from 'h3'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/technologies/[name]/approvals.post'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: { setApproval: vi.fn() }
}))

const { mockRequireAuth, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const memberUser = {
  id: 'user-1', email: 'user@example.com', role: 'user' as const,
  teams: [{ name: 'Platform Team' }]
}

const superuser = {
  id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: []
}

const feature = await loadFeature('./test/server/api/approvals.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let result: Awaited<ReturnType<typeof handler>>
  let caughtError: unknown

  Background(({ Given }) => {
    Given('the API server is running', () => {
      vi.clearAllMocks()
      mockGetImpersonatorId.mockResolvedValue(null)
    })
  })

  Scenario('Team member sets approval for their own team', ({ Given, When, Then, And }) => {
    Given('I am authenticated as a member of "Platform Team"', () => {
      mockRequireAuth.mockResolvedValue(memberUser)
    })
    When('I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"', async () => {
      vi.mocked(technologyService.setApproval).mockResolvedValue({ technologyName: 'React', teamName: 'Platform Team', time: 'invest' })
      result = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { teamName: 'Platform Team', time: 'invest' } }))
    })
    Then('the response should be successful', () => { expect(result.success).toBe(true) })
    And('the approval should be set with the correct parameters', () => {
      expect(technologyService.setApproval).toHaveBeenCalledWith(
        expect.objectContaining({ technologyName: 'React', teamName: 'Platform Team', time: 'invest', userId: 'user-1' })
      )
    })
  })

  Scenario('Superuser sets approval for any team', ({ Given, When, Then }) => {
    Given('I am authenticated as a superuser', () => { mockRequireAuth.mockResolvedValue(superuser) })
    When('I request POST "/api/technologies/React/approvals" for "Other Team" with time "eliminate"', async () => {
      vi.mocked(technologyService.setApproval).mockResolvedValue({ technologyName: 'React', teamName: 'Other Team', time: 'eliminate' })
      result = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { teamName: 'Other Team', time: 'eliminate' } }))
    })
    Then('the response should be successful', () => { expect(result.success).toBe(true) })
  })

  Scenario('User not in team is rejected', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => { mockRequireAuth.mockResolvedValue(memberUser) })
    When('I request POST "/api/technologies/React/approvals" for "Other Team" with time "invest"', async () => {
      caughtError = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { teamName: 'Other Team', time: 'invest' } })).catch(e => e)
    })
    Then('the request should be rejected with status 403', () => {
      expect(caughtError).toMatchObject({ statusCode: 403 })
    })
  })

  Scenario('Missing teamName returns 400', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => { mockRequireAuth.mockResolvedValue(memberUser) })
    When('I request POST "/api/technologies/React/approvals" without a teamName', async () => {
      caughtError = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { time: 'invest' } })).catch(e => e)
    })
    Then('the request should be rejected with status 400', () => {
      expect(caughtError).toMatchObject({ statusCode: 400 })
    })
  })

  Scenario('Missing time returns 400', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => { mockRequireAuth.mockResolvedValue(memberUser) })
    When('I request POST "/api/technologies/React/approvals" without a time value', async () => {
      caughtError = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { teamName: 'Platform Team' } })).catch(e => e)
    })
    Then('the request should be rejected with status 400', () => {
      expect(caughtError).toMatchObject({ statusCode: 400 })
    })
  })

  Scenario('Missing technology name param returns 400', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => { mockRequireAuth.mockResolvedValue(memberUser) })
    When('I request POST approvals without a technology name', async () => {
      caughtError = await handler(mockEvent({ method: 'POST', params: {}, body: { teamName: 'Platform Team', time: 'invest' } })).catch(e => e)
    })
    Then('the request should be rejected with status 400', () => {
      expect(caughtError).toMatchObject({ statusCode: 400 })
    })
  })

  Scenario('Unauthenticated request is rejected', ({ Given, When, Then }) => {
    Given('I am not authenticated', () => {
      mockRequireAuth.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))
    })
    When('I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"', async () => {
      caughtError = await handler(mockEvent({ method: 'POST', params: { name: 'React' }, body: { teamName: 'Platform Team', time: 'invest' } })).catch(e => e)
    })
    Then('the request should be rejected with status 401', () => {
      expect(caughtError).toMatchObject({ statusCode: 401 })
    })
  })

  Scenario('URL-encoded technology name is decoded', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => { mockRequireAuth.mockResolvedValue(memberUser) })
    When('I request POST approvals for technology "My%20Tech"', async () => {
      vi.mocked(technologyService.setApproval).mockResolvedValue({ technologyName: 'My Tech', teamName: 'Platform Team', time: 'invest' })
      result = await handler(mockEvent({ method: 'POST', params: { name: 'My%20Tech' }, body: { teamName: 'Platform Team', time: 'invest' } }))
    })
    Then('the approval should be set for technology "My Tech"', () => {
      expect(technologyService.setApproval).toHaveBeenCalledWith(
        expect.objectContaining({ technologyName: 'My Tech' })
      )
    })
  })
})
