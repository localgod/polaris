import type {
  EOLRollupComponentItem,
  EOLRollupItem,
  EOLRollupResponse,
  EOLRollupTechnologyItem,
  EOLStatus
} from '~~/types/api'
import { encodeComponentKey } from '~~/utils/component-identity'
import { ComponentRepository, type ComponentEOLCandidate } from '../repositories/component.repository'
import { EOLService } from './eol.service'

type RollupMode = 'approaching' | 'expired'

export class EOLRollupService {
  constructor(
    private readonly componentRepo = new ComponentRepository(),
    private readonly eolService = new EOLService()
  ) {}

  async getApproaching(): Promise<EOLRollupResponse> {
    return await this.getRollup('approaching')
  }

  async getExpired(): Promise<EOLRollupResponse> {
    return await this.getRollup('expired')
  }

  private async getRollup(mode: RollupMode): Promise<EOLRollupResponse> {
    const candidates = await this.componentRepo.findEOLCandidates()
    const enriched = await Promise.all(candidates.map(async candidate => ({
      candidate,
      lifecycle: await this.eolService.getEOLStatus(candidate)
    })))

    const componentItems = enriched
      .filter(({ lifecycle }) => this.matchesMode(lifecycle, mode))
      .map(({ candidate, lifecycle }) => this.toComponentItem(candidate, lifecycle))

    const technologyItems = this.toTechnologyItems(componentItems)
    const items: EOLRollupItem[] = [...componentItems, ...technologyItems]

    return {
      windowDays: this.eolService.getApproachingDays(),
      items,
      summary: {
        components: componentItems.length,
        technologies: technologyItems.length,
        systems: this.countSystems(items)
      }
    }
  }

  private matchesMode(lifecycle: EOLStatus, mode: RollupMode): boolean {
    return mode === 'approaching'
      ? lifecycle.status === 'approaching_eol'
      : lifecycle.status === 'unsupported'
  }

  private toComponentItem(candidate: ComponentEOLCandidate, lifecycle: EOLStatus): EOLRollupComponentItem {
    return {
      kind: 'component',
      key: encodeComponentKey(candidate),
      name: candidate.name,
      group: candidate.group,
      version: candidate.version,
      packageManager: candidate.packageManager,
      purl: candidate.purl,
      technologyName: candidate.technologyName,
      systems: candidate.systems,
      systemCount: candidate.systems.length,
      lifecycle
    }
  }

  private toTechnologyItems(componentItems: EOLRollupComponentItem[]): EOLRollupTechnologyItem[] {
    const groups = new Map<string, EOLRollupComponentItem[]>()

    for (const item of componentItems) {
      if (!item.technologyName) continue
      const cycle = item.lifecycle.matchedCycle || item.version
      const key = `${item.technologyName}\u0000${cycle}`
      const group = groups.get(key) || []
      group.push(item)
      groups.set(key, group)
    }

    return [...groups.values()].map(group => {
      const first = group[0]!
      const systems = this.dedupeSystems(group.flatMap(item => item.systems))
      return {
        kind: 'technology',
        name: first.technologyName!,
        version: first.lifecycle.matchedCycle || first.version,
        componentCount: group.length,
        systems,
        systemCount: systems.length,
        lifecycle: first.lifecycle
      }
    })
  }

  private countSystems(items: EOLRollupItem[]): number {
    return this.dedupeSystems(items.flatMap(item => item.systems)).length
  }

  private dedupeSystems(systems: Array<{ name: string }>): Array<{ name: string }> {
    return [...new Map(systems.map(system => [system.name, system])).values()]
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
