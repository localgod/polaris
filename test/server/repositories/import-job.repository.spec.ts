import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { ImportJobRepository } from '../../../server/repositories/import-job.repository'
import { getTestContext, cleanupTestData, type TestContext } from '../../fixtures/neo4j-test-helper'
import type { Session } from 'neo4j-driver'

const PREFIX = 'test_import_job_repo_'
let ctx: TestContext
let repo: ImportJobRepository
let session: Session

beforeAll(async () => { ctx = await getTestContext() })
afterAll(async () => { if (ctx.neo4jAvailable) await cleanupTestData(ctx.driver, { prefix: PREFIX }) })

beforeEach(async () => {
  if (!ctx.neo4jAvailable) return
  await cleanupTestData(ctx.driver, { prefix: PREFIX })
  repo = new ImportJobRepository(ctx.driver)
  session = ctx.driver.session()
})

afterEach(async () => { if (session) await session.close() })

describe('[pin] ImportJobRepository', () => {
  it('creates and finds an import job with parsed filters', async () => {
    if (!ctx.neo4jAvailable) return

    const job = await repo.create({
      type: 'github-org',
      requestedBy: `${PREFIX}user`,
      organization: `${PREFIX}org`,
      filters: { language: 'TypeScript', topic: 'platform', namePattern: '^service-' },
      dryRun: false
    })

    expect(job.id).toBeTruthy()
    expect(job.status).toBe('queued')
    expect(job.organization).toBe(`${PREFIX}org`)
    expect(job.filters).toEqual({ language: 'TypeScript', topic: 'platform', namePattern: '^service-' })
    expect(job.total).toBe(0)
    expect(job.items).toEqual([])

    const found = await repo.findById(job.id)
    expect(found).toMatchObject({
      id: job.id,
      status: 'queued',
      requestedBy: `${PREFIX}user`,
      organization: `${PREFIX}org`,
      dryRun: false
    })
  })

  it('returns null for unknown jobs', async () => {
    if (!ctx.neo4jAvailable) return

    await expect(repo.findById(`${PREFIX}missing`)).resolves.toBeNull()
  })

  it('creates items and tracks item progress counters', async () => {
    if (!ctx.neo4jAvailable) return

    const job = await repo.create({
      type: 'github-org',
      requestedBy: `${PREFIX}user`,
      organization: `${PREFIX}org`,
      filters: {},
      dryRun: true
    })

    await repo.markRunning(job.id)
    await repo.createItems(job.id, [
      { repositoryFullName: `${PREFIX}org/repo-a`, repositoryUrl: `https://github.com/${PREFIX}org/repo-a` },
      { repositoryFullName: `${PREFIX}org/repo-b`, repositoryUrl: `https://github.com/${PREFIX}org/repo-b` }
    ])
    await repo.markItemRunning(job.id, `${PREFIX}org/repo-a`)
    await repo.markItemFinished(job.id, `${PREFIX}org/repo-a`, 'imported', {
      message: 'Imported',
      systemName: `${PREFIX}repo-a`,
      manifestsFound: 2,
      componentsAdded: 3,
      componentsUpdated: 4,
      relationshipsCreated: 5
    })
    await repo.markItemFinished(job.id, `${PREFIX}org/repo-b`, 'failed', {
      message: 'Import failed'
    })
    await repo.markCompleted(job.id)

    const found = await repo.findById(job.id)
    expect(found).toMatchObject({
      id: job.id,
      status: 'completed',
      dryRun: true,
      total: 2,
      completed: 2,
      failed: 1,
      skipped: 0
    })
    expect(found?.startedAt).not.toBeNull()
    expect(found?.finishedAt).not.toBeNull()
    expect(found?.items).toHaveLength(2)
    expect(found?.items[0]).toMatchObject({
      repositoryFullName: `${PREFIX}org/repo-a`,
      status: 'imported',
      message: 'Imported',
      systemName: `${PREFIX}repo-a`,
      manifestsFound: 2,
      componentsAdded: 3,
      componentsUpdated: 4,
      relationshipsCreated: 5
    })
    expect(found?.items[1]).toMatchObject({
      repositoryFullName: `${PREFIX}org/repo-b`,
      status: 'failed',
      message: 'Import failed'
    })
  })

  it('handles empty item lists and failed jobs', async () => {
    if (!ctx.neo4jAvailable) return

    const job = await repo.create({
      type: 'github-org',
      requestedBy: `${PREFIX}user`,
      organization: `${PREFIX}empty-org`,
      filters: {},
      dryRun: false
    })

    await repo.createItems(job.id, [])
    await repo.markFailed(job.id, 'Owner import failed')

    const found = await repo.findById(job.id)
    expect(found).toMatchObject({
      id: job.id,
      status: 'failed',
      total: 0,
      error: 'Owner import failed',
      items: []
    })
    expect(found?.finishedAt).not.toBeNull()
  })

  describe('[pin] findAll()', () => {
    it('filters by status', async () => {
      if (!ctx.neo4jAvailable) return

      const queued = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}queued-org`, filters: {}, dryRun: false
      })
      const completed = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}completed-org`, filters: {}, dryRun: false
      })
      await repo.createItems(completed.id, [])
      await repo.markCompleted(completed.id)

      const result = await repo.findAll({ statuses: ['queued'] })
      const ids = result.jobs.map(j => j.id)

      expect(ids).toContain(queued.id)
      expect(ids).not.toContain(completed.id)
    })

    it('filters by organization search substring', async () => {
      if (!ctx.neo4jAvailable) return

      const job = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}searchable-org`, filters: {}, dryRun: false
      })
      const other = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}other-org`, filters: {}, dryRun: false
      })

      const result = await repo.findAll({ search: 'searchable' })
      const ids = result.jobs.map(j => j.id)

      expect(ids).toContain(job.id)
      expect(ids).not.toContain(other.id)
    })

    it('paginates with skip/limit and reports total', async () => {
      if (!ctx.neo4jAvailable) return

      for (let i = 0; i < 3; i++) {
        await repo.create({
          type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}limit-org-${i}`, filters: {}, dryRun: false
        })
      }

      const result = await repo.findAll({ search: `${PREFIX}limit-org`, skip: 0, limit: 2 })
      expect(result.jobs.length).toBeLessThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(3)
    })
  })

  describe('[pin] markCancelled() and cancelPendingItems()', () => {
    it('cancels a running job and skips its pending/running items', async () => {
      if (!ctx.neo4jAvailable) return

      const job = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}cancel-org`, filters: {}, dryRun: false
      })
      await repo.markRunning(job.id)
      await repo.createItems(job.id, [
        { repositoryFullName: `${PREFIX}cancel-org/repo-a`, repositoryUrl: `https://github.com/${PREFIX}cancel-org/repo-a` },
        { repositoryFullName: `${PREFIX}cancel-org/repo-b`, repositoryUrl: `https://github.com/${PREFIX}cancel-org/repo-b` }
      ])
      await repo.markItemRunning(job.id, `${PREFIX}cancel-org/repo-a`)

      await repo.markCancelled(job.id)
      await repo.cancelPendingItems(job.id)

      const found = await repo.findById(job.id)
      expect(found).toMatchObject({ status: 'cancelled', skipped: 2 })
      expect(found?.finishedAt).not.toBeNull()
      expect(found?.items.every(item => item.status === 'skipped')).toBe(true)
    })

    it('does not cancel an already-completed job', async () => {
      if (!ctx.neo4jAvailable) return

      const job = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}already-done-org`, filters: {}, dryRun: false
      })
      await repo.createItems(job.id, [])
      await repo.markCompleted(job.id)

      await repo.markCancelled(job.id)

      const found = await repo.findById(job.id)
      expect(found?.status).toBe('completed')
    })
  })

  describe('[pin] delete()', () => {
    it('removes the job and its items', async () => {
      if (!ctx.neo4jAvailable) return

      const job = await repo.create({
        type: 'github-org', requestedBy: `${PREFIX}user`, organization: `${PREFIX}delete-org`, filters: {}, dryRun: false
      })
      await repo.createItems(job.id, [
        { repositoryFullName: `${PREFIX}delete-org/repo-a`, repositoryUrl: `https://github.com/${PREFIX}delete-org/repo-a` }
      ])

      await repo.delete(job.id)

      await expect(repo.findById(job.id)).resolves.toBeNull()
    })

    it('is a no-op for an unknown job id', async () => {
      if (!ctx.neo4jAvailable) return

      await expect(repo.delete(`${PREFIX}missing`)).resolves.toBeUndefined()
    })
  })
})
