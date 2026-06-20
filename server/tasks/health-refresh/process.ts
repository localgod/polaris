import { healthRefreshService } from '../../services/singletons'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'health-refresh:process',
    description: 'Process the next queued component health refresh job'
  },
  async run() {
    const jobId = await healthRefreshService.processNextQueuedJob()
    if (jobId) {
      logger.info({ jobId }, 'Processed health refresh job')
    }
    return { jobId }
  }
})
