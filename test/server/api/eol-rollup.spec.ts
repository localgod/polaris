import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import approachingHandler from '../../../server/api/eol/approaching.get'
import expiredHandler from '../../../server/api/eol/expired.get'
import { eolRollupService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  eolRollupService: {
    getApproaching: vi.fn(),
    getExpired: vi.fn()
  }
}))

const rollup = {
  windowDays: 90,
  items: [],
  summary: {
    components: 0,
    technologies: 0,
    systems: 0
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('[pin] EOL rollup API', () => {
  it('returns approaching EOL rollup data', async () => {
    vi.mocked(eolRollupService.getApproaching).mockResolvedValue(rollup)

    const result = await approachingHandler(mockEvent())

    expect(eolRollupService.getApproaching).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, data: rollup, count: 0 })
  })

  it('returns expired EOL rollup data', async () => {
    vi.mocked(eolRollupService.getExpired).mockResolvedValue(rollup)

    const result = await expiredHandler(mockEvent())

    expect(eolRollupService.getExpired).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, data: rollup, count: 0 })
  })
})
