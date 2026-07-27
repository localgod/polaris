import { ComponentRepository } from '../../repositories/component.repository'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'components:cleanup-orphaned',
    description: 'Delete Component nodes no longer used by any system and not claimed by a Technology'
  },
  async run() {
    const repo = new ComponentRepository()
    const deletedCount = await repo.deleteOrphaned()
    if (deletedCount > 0) {
      logger.info({ deletedCount }, 'Deleted orphaned components')
    }
    return { deletedCount }
  }
})
