import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/systems/[name]/scorecard.get'
import { scorecardService } from '../../../server/services/singletons'
import type { Scorecard } from '../../../types/api'

vi.mock('../../../server/services/singletons', () => ({
  scorecardService: { getSystemScorecard: vi.fn() }
}))

const mockScorecard: Scorecard = {
  score: 5,
  maxScore: 5,
  checks: [
    { id: 'sbom-freshness', label: 'SBOM freshness', passed: true, detail: 'ok' }
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('[contract] GET /api/systems/{name}/scorecard', () => {
  it('returns the scorecard for an existing system', async () => {
    vi.mocked(scorecardService.getSystemScorecard).mockResolvedValue(mockScorecard)

    const result = await handler(mockEvent({ params: { name: 'checkout-api' } }))

    expect(scorecardService.getSystemScorecard).toHaveBeenCalledWith('checkout-api')
    expect(result).toMatchObject({ success: true, data: mockScorecard })
  })

  it('decodes URL-encoded system names', async () => {
    vi.mocked(scorecardService.getSystemScorecard).mockResolvedValue(mockScorecard)

    await handler(mockEvent({ params: { name: 'checkout%20api' } }))

    expect(scorecardService.getSystemScorecard).toHaveBeenCalledWith('checkout api')
  })

  it('returns 404 when the system does not exist', async () => {
    vi.mocked(scorecardService.getSystemScorecard).mockResolvedValue(null)

    await expect(handler(mockEvent({ params: { name: 'missing-system' } }))).rejects.toMatchObject({
      statusCode: 404
    })
  })

  it('returns 400 when the name param is missing', async () => {
    await expect(handler(mockEvent({ params: {} }))).rejects.toMatchObject({
      statusCode: 400
    })
  })
})
