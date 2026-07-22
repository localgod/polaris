import { describe, it, expect, vi } from 'vitest'
import { mockEvent } from '../../fixtures/h3-event'
import handler from '../../../server/api/technologies/[name]/graph.get'
import { technologyService } from '../../../server/services/singletons'

vi.mock('../../../server/services/singletons', () => ({
  technologyService: {
    getGraph: vi.fn()
  }
}))

describe('[pin] GET /api/technologies/{name}/graph', () => {
  it('should return 400 when the name route param is missing', async () => {
    await expect(
      handler(mockEvent({ method: 'GET' }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should return 404 when the technology does not exist', async () => {
    vi.mocked(technologyService.getGraph).mockResolvedValue(null)

    await expect(
      handler(mockEvent({ method: 'GET', params: { name: 'Nonexistent' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('should URI-decode the name param before passing it to the service', async () => {
    vi.mocked(technologyService.getGraph).mockResolvedValue([])

    await handler(mockEvent({ method: 'GET', params: { name: 'My%20Tech' } }))

    expect(technologyService.getGraph).toHaveBeenCalledWith('My Tech')
  })
})

describe('[contract] GET /api/technologies/{name}/graph — response shape', () => {
  it('should return { success: true, data: { technology, systems } } with systems passed through unchanged', async () => {
    const systems = [
      { systemName: 'sys-a', ownerTeamName: 'Team A', environment: 'prod', approved: true, time: 'invest', versions: ['1.0.0'] },
      { systemName: 'sys-b', ownerTeamName: null, environment: null, approved: false, time: null, versions: ['2.0.0'] }
    ]
    vi.mocked(technologyService.getGraph).mockResolvedValue(systems)

    const result = await handler(mockEvent({ method: 'GET', params: { name: 'React' } }))

    expect(result).toMatchObject({
      success: true,
      data: { technology: 'React', systems }
    })
  })
})
