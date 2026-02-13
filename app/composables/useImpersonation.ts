interface ImpersonatedUser {
  id: string
  email: string
  name: string | null
  role: string
}

interface ImpersonationState {
  active: boolean
  user: ImpersonatedUser | null
}

const state = ref<ImpersonationState>({ active: false, user: null })
const loading = ref(false)

export function useImpersonation() {
  async function fetchStatus() {
    try {
      const data = await $fetch<ImpersonationState>('/api/admin/impersonate')
      state.value = data
    } catch {
      state.value = { active: false, user: null }
    }
  }

  async function startImpersonating(userId: string) {
    loading.value = true
    try {
      const data = await $fetch<{ success: boolean; impersonating: ImpersonatedUser }>('/api/admin/impersonate', {
        method: 'POST',
        body: { userId }
      })
      state.value = { active: true, user: data.impersonating }
      await refreshNuxtData()
    } finally {
      loading.value = false
    }
  }

  async function stopImpersonating() {
    loading.value = true
    try {
      await $fetch('/api/admin/impersonate', { method: 'DELETE' })
      state.value = { active: false, user: null }
      await refreshNuxtData()
    } finally {
      loading.value = false
    }
  }

  return {
    impersonation: state,
    impersonationLoading: loading,
    fetchImpersonationStatus: fetchStatus,
    startImpersonating,
    stopImpersonating
  }
}
