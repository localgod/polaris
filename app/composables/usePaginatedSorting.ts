import type { ComputedRef, Ref } from 'vue'
import type { SortingState } from '@tanstack/vue-table'

interface UsePaginatedSortingOptions {
  pageSize?: number
  resetOn?: Array<Ref<unknown> | ComputedRef<unknown>>
}

interface UsePaginatedSortingReturn {
  sorting: Ref<SortingState>
  page: Ref<number>
  pageSize: number
  offset: ComputedRef<number>
  sortBy: ComputedRef<string | undefined>
  sortOrder: ComputedRef<'asc' | 'desc' | undefined>
}

/**
 * Owns the page/sorting state shared by every server-paginated UTable, and
 * derives the offset/sortBy/sortOrder query values from it. Does not build
 * the fetch query itself — pageSize/param naming (offset vs skip) and extra
 * filters vary per page, so callers assemble their own useFetch query from
 * the returned refs.
 */
export function usePaginatedSorting(options: UsePaginatedSortingOptions = {}): UsePaginatedSortingReturn {
  const pageSize = options.pageSize ?? 20

  const sorting = ref<SortingState>([])
  const page = ref(1)

  const offset = computed(() => (page.value - 1) * pageSize)
  const sortBy = computed(() => sorting.value.length ? sorting.value[0]!.id : undefined)
  const sortOrder = computed<'asc' | 'desc' | undefined>(() =>
    sorting.value.length ? (sorting.value[0]!.desc ? 'desc' : 'asc') : undefined
  )

  watch([sorting, ...(options.resetOn ?? [])], () => {
    page.value = 1
  })

  return { sorting, page, pageSize, offset, sortBy, sortOrder }
}
