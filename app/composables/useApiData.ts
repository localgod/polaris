import type { Ref } from 'vue'
import type { ApiResponse } from '~~/types/api'

/**
 * Extract count from API response with proper type narrowing
 * 
 * @param data - Ref containing API response
 * @returns Computed count value (0 if error or no data)
 */
export function useApiCount<T>(data: Ref<ApiResponse<T> | null | undefined>) {
  return computed(() => {
    if (!data.value) return 0
    return data.value.success ? data.value.count : 0
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
