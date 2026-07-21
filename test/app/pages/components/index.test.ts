// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, ref, unref, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComponentsPage from '../../../../app/pages/components/index.vue'
import { usePaginatedSorting } from '../../../../app/composables/usePaginatedSorting'
import { useApiCount, useApiData } from '../../../../app/composables/useApiData'

describe('[pin] components index page', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies direct-only filtering by default', async () => {
    const useFetch = vi.fn(async () => ({
      data: ref({ success: true, data: [], count: 0, total: 0 }),
      pending: ref(false),
      error: ref(null)
    }))

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useRoute', () => ({ query: {} }))
    vi.stubGlobal('useCookie', () => ref('true'))
    vi.stubGlobal('useFetch', useFetch)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useSortableTable', () => ({
      getSortableHeader: () => 'sortable'
    }))
    vi.stubGlobal('useTableSearch', () => ({
      searchInput: ref(''),
      debouncedSearch: ref('')
    }))
    vi.stubGlobal('usePaginatedSorting', usePaginatedSorting)
    vi.stubGlobal('useApiData', useApiData)
    vi.stubGlobal('useApiCount', useApiCount)

    mount(defineComponent({
      components: { ComponentsPage },
      template: '<Suspense><ComponentsPage /></Suspense>'
    }), {
      global: {
        stubs: {
          ComponentVersionsModal: true,
          NuxtLink: { props: ['to'], template: '<a><slot /></a>' },
          UAlert: { props: ['title', 'description'], template: '<div>{{ title }}{{ description }}</div>' },
          UBadge: { template: '<span><slot /></span>' },
          UButton: { template: '<button><slot /></button>' },
          UCard: { template: '<section><slot /></section>' },
          UIcon: true,
          UInput: true,
          UPageHeader: { props: ['title'], template: '<header><h1>{{ title }}</h1><slot name="description" /></header>' },
          UPagination: true,
          USwitch: true,
          UTable: { props: ['data'], template: '<div><slot name="empty" /></div>' },
          UTooltip: { template: '<span><slot /><slot name="content" /></span>' },
          PaginatedTable: { template: '<section><slot name="header" /><slot name="empty" /></section>' },
          TableSearchHeader: { template: '<div><slot /></div>' }
        }
      }
    })
    await flushPromises()

    expect(useFetch).toHaveBeenCalledOnce()
    expect(useFetch.mock.calls[0][0]).toBe('/api/components/grouped')
    expect(unref(useFetch.mock.calls[0][1].query.direct)).toBe('true')
  })
})
