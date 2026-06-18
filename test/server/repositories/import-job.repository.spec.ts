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

describe('ImportJobRepository', () => {
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
})
