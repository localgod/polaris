// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComponentDetailPage from '../../../../app/pages/components/[key].vue'
import type { ComponentDetail } from '../../../../types/api'

const baseComponent: ComponentDetail = {
  name: 'node',
  version: '24.16.0',
  packageManager: 'npm',
  purl: 'pkg:npm/node@24.16.0',
  cpe: null,
  bomRef: null,
  type: 'library',
  group: null,
  scope: null,
  isDirect: null,
  hashes: [],
  licenses: [],
  copyright: null,
  supplier: null,
  author: null,
  publisher: null,
  description: null,
  homepage: null,
  externalReferences: [],
  releaseDate: null,
  publishedDate: null,
  modifiedDate: null,
  technologyName: 'Node.js',
  systemCount: 1,
  systems: [{ name: 'catalog', scope: 'runtime', isDirect: true }],
  directDependencies: [
    {
      name: 'semver',
      group: null,
      version: '7.6.3',
      packageManager: 'npm',
      purl: 'pkg:npm/semver@7.6.3',
      scope: 'runtime',
      isDirect: true
    }
  ],
  eol: null,
  packageMetadata: null,
  securityScorecard: null
}

function mountPage(options: {
  query?: Record<string, string>
  component?: Partial<ComponentDetail> & Record<string, unknown>
} = {}) {
  const route = reactive({
    params: { key: 'component-key' },
    query: { ...(options.query ?? {}) }
  })
  const replace = vi.fn(async ({ query }: { query: Record<string, string> }) => {
    route.query = { ...query }
  })
  const component = {
    ...baseComponent,
    ...(options.component ?? {})
  } as ComponentDetail

  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ replace }))
  vi.stubGlobal('useFetch', vi.fn(async () => ({
    data: ref({ success: true, data: component }),
    pending: ref(false),
    error: ref(null)
  })))
  vi.stubGlobal('useHead', vi.fn())

  const wrapper = mount(defineComponent({
    components: { ComponentDetailPage },
    template: '<Suspense><ComponentDetailPage /></Suspense>'
  }), {
    global: {
      stubs: {
        ComponentDependencyTree: {
          props: ['componentKey', 'systemName'],
          template: '<div data-test="dependency-tree" :data-component-key="componentKey" :data-system-name="systemName || \'\'" />'
        },
        NuxtLink: { props: ['to'], template: '<a><slot /></a>' },
        UAlert: { props: ['title', 'description'], template: '<div><strong>{{ title }}</strong><span>{{ description }}</span><slot name="actions" /></div>' },
        UBadge: { props: ['label'], template: '<span>{{ label }}<slot /></span>' },
        UButton: {
          props: ['label'],
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}<slot /><slot name="trailing" /></button>'
        },
        UCard: { template: '<section><slot name="header" /><slot /></section>' },
        UPageHeader: { props: ['title', 'description'], template: '<header><h1>{{ title }}</h1><p>{{ description }}</p></header>' },
        USkeleton: { template: '<div />' }
      }
    }
  })

  return { wrapper, route, replace }
}

describe('component detail dependencies section', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to system dependency view when fromSystem is present', async () => {
    const { wrapper } = mountPage({ query: { fromSystem: 'catalog' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Dependencies')
    expect(wrapper.text()).toContain('1 direct dependency')
    expect(wrapper.text()).toContain('All Dependencies')
    expect(wrapper.text()).toContain('Dependencies in catalog')
    expect(wrapper.get('[data-test="dependency-tree"]').attributes('data-system-name')).toBe('catalog')
  })

  it('persists global dependency view in the URL', async () => {
    const { wrapper, route, replace } = mountPage({ query: { fromSystem: 'catalog' } })
    await flushPromises()

    const globalToggle = wrapper.findAll('button').find(button => button.text() === 'All Dependencies')
    expect(globalToggle).toBeTruthy()

    await globalToggle!.trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({
      query: {
        fromSystem: 'catalog',
        dependencyView: 'global'
      }
    })
    expect(route.query.dependencyView).toBe('global')
    expect(wrapper.get('[data-test="dependency-tree"]').attributes('data-system-name')).toBe('')
  })

  it('uses global dependency view when there is no system context', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Global view')
    expect(wrapper.text()).not.toContain('All Dependencies')
    expect(wrapper.get('[data-test="dependency-tree"]').attributes('data-system-name')).toBe('')
  })

  it('handles missing direct dependency data as zero dependencies', async () => {
    const { wrapper } = mountPage({
      component: {
        directDependencies: undefined
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('0 direct dependencies')
  })

  it('renders security scorecard enrichment when available', async () => {
    const { wrapper } = mountPage({
      component: {
        securityScorecard: {
          status: 'available',
          repository: {
            host: 'github.com',
            owner: 'nodejs',
            name: 'node',
            url: 'https://github.com/nodejs/node'
          },
          score: 8.5,
          checks: [
            { name: 'Code-Review', score: 9, reason: 'Found pull request reviews.' },
            { name: 'Vulnerabilities', score: 7, reason: 'No known vulnerabilities detected.' }
          ],
          scannedAt: '2026-05-30',
          source: {
            name: 'OpenSSF Scorecard',
            url: 'https://scorecard.dev/viewer/?uri=github.com/nodejs/node'
          }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Security Scorecard')
    expect(wrapper.text()).toContain('nodejs/node')
    expect(wrapper.text()).toContain('8.5 / 10')
    expect(wrapper.text()).toContain('Code-Review')
    expect(wrapper.text()).toContain('Vulnerabilities')
  })
})
