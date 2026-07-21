import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/teams/[name]/scorecard.get'
import { scorecardService } from '../../../server/services/singletons'
import type { Scorecard } from '../../../types/api'

vi.mock('../../../server/services/singletons', () => ({
  scorecardService: { getTeamScorecard: vi.fn() }
}))

const mockScorecard: Scorecard = {
  score: 3,
  maxScore: 5,
  checks: [
    { id: 'sbom-freshness', label: 'SBOM freshness', passed: true, detail: 'ok' }
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('[contract] GET /api/teams/{name}/scorecard', () => {
  it('returns the scorecard for an existing team', async () => {
    vi.mocked(scorecardService.getTeamScorecard).mockResolvedValue(mockScorecard)

    const result = await handler(mockEvent({ params: { name: 'payments-team' } }))

    expect(scorecardService.getTeamScorecard).toHaveBeenCalledWith('payments-team')
    expect(result).toMatchObject({ success: true, data: mockScorecard })
  })

  it('returns 404 when the team does not exist', async () => {
    vi.mocked(scorecardService.getTeamScorecard).mockResolvedValue(null)

    await expect(handler(mockEvent({ params: { name: 'missing-team' } }))).rejects.toMatchObject({
      statusCode: 404
    })
  })

  it('returns 400 when the name param is missing', async () => {
    await expect(handler(mockEvent({ params: {} }))).rejects.toMatchObject({
      statusCode: 400
    })
  })
})
