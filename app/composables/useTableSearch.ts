import type { Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

interface UseTableSearchOptions {
  debounceMs?: number
}

interface UseTableSearchReturn {
  searchInput: Ref<string>
  debouncedSearch: Ref<string>
}

/**
 * Manages search input with debouncing for table filtering.
 * Separates the raw input value from the debounced value used in queries.
 *
 * @param options - Configuration options (debounceMs defaults to 300ms)
 * @returns Object with searchInput (for v-model) and debouncedSearch (for queries)
 *
 * @example
 * const { searchInput, debouncedSearch } = useTableSearch()
 * const { data } = await useFetch('/api/items', {
 *   query: { search: debouncedSearch }
 * })
 */
export function useTableSearch(options: UseTableSearchOptions = {}): UseTableSearchReturn {
  const debounceMs = options.debounceMs ?? 300

  const searchInput = ref('')
  const debouncedSearch = ref('')

  const updateSearch = useDebounceFn((value: string) => {
    debouncedSearch.value = value
  }, debounceMs)

  watch(searchInput, updateSearch)

  return { searchInput, debouncedSearch }
}
