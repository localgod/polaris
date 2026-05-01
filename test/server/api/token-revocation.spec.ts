import { expect, vi, beforeAll } from 'vitest'
import { createError } from 'h3'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/admin/users/[userId]/tokens/[tokenId].delete'
import { tokenService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  tokenService: { revokeToken: vi.fn() }
}))

vi.mock('../../../server/repositories/audit-log.repository', () => ({
  AuditLogRepository: vi.fn().mockImplementation(function (this: { create: ReturnType<typeof vi.fn> }) {
    this.create = vi.fn().mockResolvedValue(undefined)
  })
}))

const { mockRequireSuperuser, mockGetCurrentUser, mockGetImpersonatorId } = vi.hoisted(() => ({
  mockRequireSuperuser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockGetImpersonatorId: vi.fn().mockResolvedValue(null)
}))

beforeAll(() => {
  vi.stubGlobal('requireSuperuser', mockRequireSuperuser)
  vi.stubGlobal('getCurrentUser', mockGetCurrentUser)
  vi.stubGlobal('getImpersonatorId', mockGetImpersonatorId)
})

const superuser = { id: 'admin-1', email: 'admin@example.com', role: 'superuser' as const, teams: [] }

const feature = await loadFeature('./test/server/api/token-revocation.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  let result: Awaited<ReturnType<typeof handler>>
  let caughtError: unknown

  Background(({ Given }) => {
    Given('the API server is running', () => {
      vi.clearAllMocks()
      mockGetImpersonatorId.mockResolvedValue(null)
      mockGetCurrentUser.mockResolvedValue(superuser)
    })
  })

  Scenario('Superuser revokes a token they own', ({ Given, When, Then, And }) => {
    Given('I am a superuser', () => { mockRequireSuperuser.mockResolvedValue(superuser) })
    When('I request DELETE "/api/admin/users/user-1/tokens/tok-1"', async () => {
      vi.mocked(tokenService.revokeToken).mockResolvedValue(true)
      result = await handler(mockEvent({ method: 'DELETE', params: { userId: 'user-1', tokenId: 'tok-1' } }))
    })
    Then('the response should be successful', () => { expect(result.success).toBe(true) })
    And('the token should be revoked with the correct userId', () => {
      expect(tokenService.revokeToken).toHaveBeenCalledWith('tok-1', 'user-1')
    })
  })

  Scenario('Token not belonging to userId returns 404', ({ Given, When, Then }) => {
    Given('I am a superuser', () => { mockRequireSuperuser.mockResolvedValue(superuser) })
    When('I request DELETE with a tokenId that belongs to a different user', async () => {
      vi.mocked(tokenService.revokeToken).mockResolvedValue(false)
      caughtError = await handler(mockEvent({ method: 'DELETE', params: { userId: 'wrong-user', tokenId: 'tok-1' } })).catch(e => e)
    })
    Then('the request should be rejected with status 404', () => {
      expect(caughtError).toMatchObject({ statusCode: 404 })
    })
  })

  Scenario('Unauthenticated request is rejected', ({ Given, When, Then }) => {
    Given('I am not authenticated', () => {
      mockRequireSuperuser.mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' }))
    })
    When('I request DELETE "/api/admin/users/user-1/tokens/tok-1"', async () => {
      caughtError = await handler(mockEvent({ method: 'DELETE', params: { userId: 'user-1', tokenId: 'tok-1' } })).catch(e => e)
    })
    Then('the request should be rejected with status 401', () => {
      expect(caughtError).toMatchObject({ statusCode: 401 })
    })
  })

  Scenario('Non-superuser is rejected', ({ Given, When, Then }) => {
    Given('I am authenticated but not a superuser', () => {
      mockRequireSuperuser.mockRejectedValue(createError({ statusCode: 403, message: 'Superuser access required' }))
    })
    When('I request DELETE "/api/admin/users/user-1/tokens/tok-1"', async () => {
      caughtError = await handler(mockEvent({ method: 'DELETE', params: { userId: 'user-1', tokenId: 'tok-1' } })).catch(e => e)
    })
    Then('the request should be rejected with status 403', () => {
      expect(caughtError).toMatchObject({ statusCode: 403 })
    })
  })

  Scenario('Missing tokenId returns 400', ({ Given, When, Then }) => {
    Given('I am a superuser', () => { mockRequireSuperuser.mockResolvedValue(superuser) })
    When('I request DELETE with a missing tokenId', async () => {
      caughtError = await handler(mockEvent({ method: 'DELETE', params: { userId: 'user-1' } })).catch(e => e)
    })
    Then('the request should be rejected with status 400', () => {
      expect(caughtError).toMatchObject({ statusCode: 400 })
    })
  })

  Scenario('Missing userId returns 400', ({ Given, When, Then }) => {
    Given('I am a superuser', () => { mockRequireSuperuser.mockResolvedValue(superuser) })
    When('I request DELETE with a missing userId', async () => {
      caughtError = await handler(mockEvent({ method: 'DELETE', params: { tokenId: 'tok-1' } })).catch(e => e)
    })
    Then('the request should be rejected with status 400', () => {
      expect(caughtError).toMatchObject({ statusCode: 400 })
    })
  })
})
