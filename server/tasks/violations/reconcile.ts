import { violationService } from '../../services/singletons'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'violations:reconcile',
    description: 'Reconcile computed license/compliance/version-constraint violation sets against tracked violation nodes'
  },
  async run() {
    const summary = await violationService.reconcileAll()
    logger.info(summary, 'Reconciled violation tracking')
    return summary
  }
})
