<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Policies</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Governance and compliance rules</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading policies...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <UiCard>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Policies</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ count }}</p>
          </div>
        </UiCard>

        <div class="grid grid-cols-1 gap-6">
          <UiCard v-for="policy in data.data" :key="policy.name">
            <template #header>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ policy.name }}</h3>
                  <p v-if="policy.description" class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ policy.description }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <UiBadge v-if="policy.severity" :variant="getSeverityVariant(policy.severity)" size="sm">
                    {{ policy.severity }}
                  </UiBadge>
                  <button
                    class="p-1 text-gray-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                    title="Delete policy"
                    @click="confirmDelete(policy.name)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </template>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div v-if="policy.ruleType">
                <span class="text-gray-600 dark:text-gray-300">Type:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.ruleType }}</span>
              </div>
              <div v-if="policy.scope">
                <span class="text-gray-600 dark:text-gray-300">Scope:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.scope }}</span>
              </div>
              <div v-if="policy.enforcedBy">
                <span class="text-gray-600 dark:text-gray-300">Enforced By:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.enforcedBy }}</span>
              </div>
              <div v-if="policy.status" class="flex items-center">
                <span class="text-gray-600 dark:text-gray-300">Status:</span>
                <button
                  class="ml-2 flex items-center gap-1 group"
                  :title="policy.status === 'active' ? 'Click to disable' : 'Click to enable'"
                  @click="toggleStatus(policy)"
                >
                  <UiBadge 
                    :variant="policy.status === 'active' ? 'success' : 'neutral'" 
                    size="sm"
                    class="group-hover:opacity-80 transition-opacity"
                  >
                    {{ policy.status }}
                  </UiBadge>
                  <svg class="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </button>
              </div>
            </div>
          </UiCard>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showDeleteModal = false" />
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Policy</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete "{{ policyToDelete }}"? This action cannot be undone.
            </p>
            <div class="mt-4 flex justify-end gap-3">
              <button
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                @click="showDeleteModal = false"
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-lg transition-colors"
                :disabled="deleting"
                @click="deletePolicy"
              >
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Status Change Modal -->
        <div v-if="showStatusModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showStatusModal = false" />
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ statusChange.newStatus === 'active' ? 'Enable' : 'Disable' }} Policy
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {{ statusChange.newStatus === 'active' 
                ? `Enable "${statusChange.policyName}"? Violations will be detected again.`
                : `Disable "${statusChange.policyName}"? Violations will no longer be detected.`
              }}
            </p>
            <div v-if="statusChange.newStatus !== 'active'" class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (recommended)
              </label>
              <input
                v-model="statusChange.reason"
                type="text"
                placeholder="e.g., Migration in progress until 2025-03-01"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
            </div>
            <div class="mt-4 flex justify-end gap-3">
              <button
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                @click="showStatusModal = false"
              >
                Cancel
              </button>
              <button
                :class="[
                  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  statusChange.newStatus === 'active' 
                    ? 'bg-success-600 hover:bg-success-700' 
                    : 'bg-warning-600 hover:bg-warning-700'
                ]"
                :disabled="updatingStatus"
                @click="updatePolicyStatus"
              >
                {{ updatingStatus ? 'Updating...' : (statusChange.newStatus === 'active' ? 'Enable' : 'Disable') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Policy } from '~~/types/api'

const { data, pending, error, refresh } = await useFetch<ApiResponse<Policy>>('/api/policies')
const count = useApiCount(data)

// Delete modal state
const showDeleteModal = ref(false)
const policyToDelete = ref('')
const deleting = ref(false)

// Status change modal state
const showStatusModal = ref(false)
const updatingStatus = ref(false)
const statusChange = ref({
  policyName: '',
  currentStatus: '',
  newStatus: '' as 'active' | 'draft' | 'archived',
  reason: ''
})

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

function confirmDelete(name: string) {
  policyToDelete.value = name
  showDeleteModal.value = true
}

async function deletePolicy() {
  if (!policyToDelete.value) return
  
  deleting.value = true
  try {
    await $fetch(`/api/policies/${encodeURIComponent(policyToDelete.value)}`, {
      method: 'DELETE'
    })
    showDeleteModal.value = false
    policyToDelete.value = ''
    await refresh()
  } catch (err) {
    console.error('Failed to delete policy:', err)
    alert('Failed to delete policy. Please try again.')
  } finally {
    deleting.value = false
  }
}

function toggleStatus(policy: Policy) {
  statusChange.value = {
    policyName: policy.name,
    currentStatus: policy.status || 'active',
    newStatus: policy.status === 'active' ? 'draft' : 'active',
    reason: ''
  }
  showStatusModal.value = true
}

async function updatePolicyStatus() {
  if (!statusChange.value.policyName) return
  
  updatingStatus.value = true
  try {
    await $fetch(`/api/policies/${encodeURIComponent(statusChange.value.policyName)}`, {
      method: 'PATCH',
      body: {
        status: statusChange.value.newStatus,
        reason: statusChange.value.reason || undefined
      }
    })
    showStatusModal.value = false
    statusChange.value = { policyName: '', currentStatus: '', newStatus: 'active', reason: '' }
    await refresh()
  } catch (err) {
    console.error('Failed to update policy status:', err)
    alert('Failed to update policy status. Please try again.')
  } finally {
    updatingStatus.value = false
  }
}

useHead({ title: 'Policies - Polaris' })
</script>
