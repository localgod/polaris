import type { Ref } from 'vue'
import type { ApiResponse } from '~~/types/api'

/**
 * Extract count from API response with proper type narrowing
 * Prefers 'total' over 'count' to support paginated responses
 * 
 * @param data - Ref containing API response
 * @returns Computed count value (0 if error or no data)
 */
export function useApiCount<T>(data: Ref<ApiResponse<T> | null | undefined>) {
  return computed(() => {
    if (!data.value) return 0
    if (!data.value.success) return 0
    // Prefer total (full count) over count (page count) for paginated responses
    return (data.value as ApiResponse<T> & { total?: number }).total || data.value.count
  })
}

/**
 * Extract data array from API response with proper type narrowing
 * 
 * @param data - Ref containing API response
 * @returns Computed data array (empty array if error or no data)
 */
export function useApiData<T>(data: Ref<ApiResponse<T> | null | undefined>) {
  return computed(() => {
    if (!data.value) return []
    return data.value.success ? data.value.data : []
  })
}
