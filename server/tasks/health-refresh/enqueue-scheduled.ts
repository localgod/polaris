import { healthRefreshService } from '../../services/singletons'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'health-refresh:enqueue-scheduled',
    description: 'Enqueue a scheduled full-landscape component health refresh'
  },
  async run() {
    const jobId = await healthRefreshService.enqueueScheduledRefresh()
    logger.info({ jobId }, 'Enqueued scheduled health refresh job')
    return { jobId }
  }
})
