<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Policies"
        description="Governance and compliance rules"
      />
      <UButton
        v-if="isSuperuser"
        label="+ Create Policy"
        @click="showCreateModal = true"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="policies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No policies found.
            </div>
          </template>
        </UTable>

        <div v-if="total > pageSize" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="pageSize"
            :sibling-count="1"
            show-edges
          />
        </div>
      </UCard>
    </template>

    <!-- Create Policy Modal -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create Policy</h3>
      </template>
      <template #body>
        <form id="create-policy-form" class="space-y-4" @submit.prevent="handleCreatePolicy">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <UInput v-model="createForm.name" placeholder="e.g. no-deprecated-technologies" required />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="createForm.description" placeholder="Policy description" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Rule Type *</label>
              <USelect v-model="createForm.ruleType" :items="ruleTypeOptions" placeholder="Select rule type" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Severity *</label>
              <USelect v-model="createForm.severity" :items="severityOptions" placeholder="Select severity" required />
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="showCreateModal = false" />
          <UButton
            type="submit"
            form="create-policy-form"
            :loading="isCreating"
            :label="isCreating ? 'Creating...' : 'Create'"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Policy Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Policy</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?</p>
        <p class="text-sm text-(--ui-text-muted) mt-2">This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="showDeleteModal = false" />
          <UButton
            :label="isDeleting ? 'Deleting...' : 'Delete'"
            color="error"
            :loading="isDeleting"
            @click="confirmDeletePolicy"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Policy } from '~~/types/api'

const { isSuperuser } = useEffectiveRole()
const { getSortableHeader } = useSortableTable()

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

const columns: TableColumn<Policy>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const policy = row.original
      return h('div', {}, [
        h('strong', {}, policy.name),
        policy.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, policy.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'ruleType',
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const ruleType = row.getValue('ruleType') as string | undefined
      if (!ruleType) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return ruleType
    }
  },
  {
    accessorKey: 'severity',
    header: ({ column }) => getSortableHeader(column, 'Severity'),
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string | undefined
      if (!severity) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getSeverityColor(severity), variant: 'subtle' }, () => severity)
    }
  },
  {
    accessorKey: 'scope',
    header: ({ column }) => getSortableHeader(column, 'Scope'),
    cell: ({ row }) => {
      const scope = row.getValue('scope') as string | undefined
      if (!scope) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return scope
    }
  },
  {
    accessorKey: 'enforcedBy',
    header: ({ column }) => getSortableHeader(column, 'Enforced By'),
    cell: ({ row }) => {
      const enforcedBy = row.getValue('enforcedBy') as string | undefined
      if (!enforcedBy) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return enforcedBy
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string | undefined
      if (!status) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: status === 'active' ? 'success' : 'neutral', variant: 'subtle' }, () => status)
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const policy = row.original

      const isActive = policy.status === 'active'
      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/policies/${encodeURIComponent(policy.name)}`)
          },
          ...(isSuperuser.value ? [
            {
              label: isActive ? 'Disable' : 'Enable',
              icon: isActive ? 'i-lucide-pause' : 'i-lucide-play',
              onSelect: () => togglePolicyStatus(policy.name, isActive ? 'disabled' : 'active')
            },
            {
              label: 'Delete',
              icon: 'i-lucide-trash-2',
              onSelect: () => openDeleteModal(policy.name)
            }
          ] : [])
        ]
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
  }
]

const sorting = ref([])
watch(sorting, () => { page.value = 1 })
const page = ref(1)
const pageSize = 20

const queryParams = computed(() => {
  const params: Record<string, string | number> = { limit: pageSize, offset: (page.value - 1) * pageSize }
  if (sorting.value.length) {
    params.sortBy = sorting.value[0].id
    params.sortOrder = sorting.value[0].desc ? 'desc' : 'asc'
  }
  return params
})

const { data, pending, error } = await useFetch<ApiResponse<Policy>>('/api/policies', {
  query: queryParams
})

const policies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

// Create policy modal
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({ name: '', description: '', ruleType: '', severity: '' })
const ruleTypeOptions = ['technology_restriction', 'version_requirement', 'license_compliance', 'deprecation_enforcement']
const severityOptions = ['critical', 'error', 'warning', 'info']

async function handleCreatePolicy() {
  isCreating.value = true
  try {
    await $fetch('/api/policies', {
      method: 'POST',
      body: createForm.value
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '', ruleType: '', severity: '' }
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to create policy')
  } finally {
    isCreating.value = false
  }
}

// Toggle policy status
async function togglePolicyStatus(name: string, newStatus: string) {
  try {
    await $fetch(`/api/policies/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to update policy status')
  }
}

// Delete policy modal
const showDeleteModal = ref(false)
const deleteTarget = ref('')
const isDeleting = ref(false)

function openDeleteModal(name: string) {
  deleteTarget.value = name
  showDeleteModal.value = true
}

async function confirmDeletePolicy() {
  isDeleting.value = true
  try {
    await $fetch(`/api/policies/${encodeURIComponent(deleteTarget.value)}`, { method: 'DELETE' })
    showDeleteModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to delete policy')
  } finally {
    isDeleting.value = false
  }
}

useHead({ title: 'Policies - Polaris' })
</script>
