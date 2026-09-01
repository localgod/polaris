import { expect, vi, beforeAll } from 'vitest'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/technologies/[name]/approvals.post'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
}))

beforeAll(() => {
  vi.stubGlobal('requireAuth', mockRequireAuth)
})

const memberUser = {
  id: 'user-1', email: 'user@example.com', role: 'user' as const,
  orgAdmin: false,
  teams: [{ name: 'Platform Team' }]
}

const feature = await loadFeature('./test/server/api/approvals.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let caughtError: unknown

  Background(({ Given }) => {
    Given('the API server is running', () => {
      vi.clearAllMocks()
    })
  })

  // [contract] removed: team-level approval write is intentionally replaced
  // by org-level TechnologyPolicy (ADR-0008). The endpoint now returns 410 Gone
  // for all requests — this is the only remaining contract.
  Scenario('Any request to the approvals endpoint returns 410 Gone', ({ Given, When, Then }) => {
    Given('I am authenticated as a member of "Platform Team"', () => {
      mockRequireAuth.mockResolvedValue(memberUser)
    })
    When('I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"', async () => {
      caughtError = await handler(mockEvent({
        method: 'POST',
        params: { name: 'React' },
        body: { teamName: 'Platform Team', time: 'invest' }
      })).catch(e => e)
    })
    Then('the request should be rejected with status 410', () => {
      expect(caughtError).toMatchObject({ statusCode: 410 })
    })
  })
})
