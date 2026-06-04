import { ref } from 'vue'
import type { Component } from '~~/types/api'

interface DescriptionState {
  description: string | null
  pending: boolean
  fetched: boolean
}

// Client-side cache: avoids re-fetching the same package within a page session.
// Keyed by `packageManager:group/name` or `packageManager:name`.
const clientCache = new Map<string, string | null>()

// Tracks in-flight promises so that concurrent fetch() calls for the same key
// reuse the existing request instead of firing duplicate network requests.
const inFlightRequests = new Map<string, Promise<void>>()

type ComponentDescriptionIdentity = Pick<Component, 'packageManager' | 'name' | 'group' | 'description'>

function cacheKey(component: ComponentDescriptionIdentity): string {
  const { packageManager, name, group } = component
  const pm = packageManager ?? 'unknown'
  return group ? `${pm}:${group}/${name}` : `${pm}:${name}`
}

/**
 * Provides lazy-loaded package description for a component.
 *
 * If the component already has a description in the database, it is returned
 * immediately. Otherwise, `fetch()` triggers a server-side registry lookup on
 * first call and caches the result for the lifetime of the page session.
 */
export function useComponentDescription(component: ComponentDescriptionIdentity) {
  const key = cacheKey(component)

  const state = ref<DescriptionState>({
    description: component.description ?? null,
    pending: false,
    fetched: component.description != null
  })

  async function fetch() {
    // Already have a description (from DB or prior fetch)
    if (state.value.fetched) return

    // Check client-side session cache
    if (clientCache.has(key)) {
      state.value.description = clientCache.get(key) ?? null
      state.value.fetched = true
      return
    }

    // If a request for this key is already in-flight, wait for it to complete
    // and then pick up the cached result rather than firing a duplicate request.
    if (inFlightRequests.has(key)) {
      await inFlightRequests.get(key)
      if (clientCache.has(key)) {
        state.value.description = clientCache.get(key) ?? null
        state.value.fetched = true
      }
      return
    }

    state.value.pending = true

    const request = (async () => {
      try {
        const query: Record<string, string> = {
          name: component.name,
          packageManager: component.packageManager ?? 'unknown'
        }
        if (component.group) query.group = component.group

        const result = await $fetch<{ description: string | null }>(
          '/api/components/description',
          { query }
        )

        const description = result?.description ?? null
        state.value.description = description
        clientCache.set(key, description)
      } catch {
        state.value.description = null
        clientCache.set(key, null)
      } finally {
        state.value.pending = false
        state.value.fetched = true
        inFlightRequests.delete(key)
      }
    })()

    inFlightRequests.set(key, request)
    await request
  }

  return {
    state,
    fetch
  }
}
