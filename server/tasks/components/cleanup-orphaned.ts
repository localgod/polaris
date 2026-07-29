import { ComponentRepository } from '../../repositories/component.repository'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'components:cleanup-orphaned',
    description: 'Delete Component nodes no longer used by any system and not claimed by a Technology, along with any Hash/ExternalReference/HealthSnapshot nodes left dangling'
  },
  async run() {
    const repo = new ComponentRepository()
    const deletedCount = await repo.deleteOrphaned()
    if (deletedCount > 0) {
      logger.info({ deletedCount }, 'Deleted orphaned components')
    }

    const satellites = await repo.deleteOrphanedSatellites()
    const satellitesDeleted = satellites.hashes + satellites.externalReferences + satellites.healthSnapshots
    if (satellitesDeleted > 0) {
      logger.info(satellites, 'Deleted orphaned satellite nodes')
    }

    return { deletedCount, ...satellites }
  }
})
