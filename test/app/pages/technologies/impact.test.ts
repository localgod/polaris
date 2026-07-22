// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImpactPage from '../../../../app/pages/technologies/[name]/impact.vue'
import { IMPACT_GRAPH_SYSTEM_LIMIT, type TechnologyImpactSystemRow } from '../../../../app/utils/technology-impact-graph'

function makeRow(overrides: Partial<TechnologyImpactSystemRow> = {}): TechnologyImpactSystemRow {
  return {
    systemName: 'sys-a',
    ownerTeamName: 'Team A',
    environment: 'prod',
    approved: true,
    time: 'invest',
    versions: ['1.0.0'],
    ...overrides
  }
}

function mountPage(systems: TechnologyImpactSystemRow[]) {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useRoute', () => ({ params: { name: 'React' } }))
  vi.stubGlobal('useFetch', vi.fn(async () => ({
    data: ref({ success: true, data: { technology: 'React', systems } }),
    pending: ref(false),
    error: ref(null)
  })))
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('useSortableTable', () => ({ getSortableHeader: () => 'sortable' }))

  return mount(defineComponent({
    components: { ImpactPage },
    template: '<Suspense><ImpactPage /></Suspense>'
  }), {
    global: {
      stubs: {
        AsyncTechnologyImpactGraph: {
          props: ['technologyName', 'nodes', 'edges'],
          template: '<div data-test="impact-graph" :data-node-count="nodes.length" />'
        },
        ClientOnly: { template: '<div><slot /></div>' },
        NuxtLink: { props: ['to'], template: '<a><slot /></a>' },
        UAlert: { props: ['title', 'description'], template: '<div data-test="alert"><strong>{{ title }}</strong><span>{{ description }}</span></div>' },
        UBadge: { template: '<span><slot /></span>' },
        UButton: { props: ['label'], template: '<button>{{ label }}<slot /></button>' },
        UCard: { template: '<section data-test="card"><slot name="header" /><slot /></section>' },
        UIcon: true,
        UPageHeader: { props: ['title', 'description'], template: '<header><h1>{{ title }}</h1></header>' },
        USkeleton: { template: '<div />' },
        PaginatedTable: {
          props: ['data'],
          template: '<section><slot name="header" /><div data-test="row-count">{{ data.length }}</div><slot name="empty" /></section>'
        }
      }
    }
  })
}

describe('[pin] technology impact page', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the impact graph and table when under the system limit', async () => {
    const wrapper = mountPage([makeRow(), makeRow({ systemName: 'sys-b', ownerTeamName: 'Team B' })])
    await flushPromises()

    expect(wrapper.find('[data-test="impact-graph"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="row-count"]').text()).toBe('2')
  })

  it('shows the over-cap alert and hides the graph when over the system limit, table still renders', async () => {
    const systems = Array.from({ length: IMPACT_GRAPH_SYSTEM_LIMIT + 1 }, (_, i) => makeRow({ systemName: `sys-${i}` }))
    const wrapper = mountPage(systems)
    await flushPromises()

    expect(wrapper.find('[data-test="impact-graph"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="alert"]').text()).toContain('Too many systems to graph')
    expect(wrapper.find('[data-test="row-count"]').text()).toBe(String(IMPACT_GRAPH_SYSTEM_LIMIT + 1))
  })
})
