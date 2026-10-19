<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Violations"
      description="Components using disallowed licenses"
      :links="[{ label: 'Back to Violations', to: '/violations', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <PaginatedTable
        v-model:sorting="sorting"
        v-model:page="page"
        :data="violations"
        :columns="columns"
        :loading="pending"
        :manual-sorting="true"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="searchInput"
              placeholder="Filter by component, license, system, or team..."
              icon="i-lucide-search"
              class="max-w-sm"
            />
            <UCheckbox v-model="showTransitive" label="Include transitive dependencies" />
            <UCheckbox v-model="includeWaived" label="Show waived" />
          </div>
        </template>
        <template #empty>
          <div class="text-center py-8">
            <UIcon name="i-lucide-check-circle" class="text-5xl text-success" />
            <h3 class="mt-4">No License Violations!</h3>
            <p class="text-muted mt-2">All components use allowed licenses.</p>
          </div>
        </template>
      </PaginatedTable>
    </template>

    <UModal v-model:open="showWaiveModal" title="Waive Violation">
      <template #body>
        <UForm id="waive-form" :schema="waiverSchema" :state="waiveForm" class="space-y-4" @submit="confirmWaive">
          <UFormField name="reason" label="Reason" required>
            <UTextarea v-model="waiveForm.reason" placeholder="Why is this risk accepted?" class="w-full" autofocus />
          </UFormField>
          <UFormField name="expiresAt" label="Expires" required hint="Waivers cannot be indefinite — pick a re-review date">
            <UInput v-model="waiveForm.expiresAt" type="date" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer="{ close }">
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" label="Cancel" @click="close" />
          <UButton type="submit" form="waive-form" color="primary" label="Waive" :loading="isWaiving" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showRevokeModal" title="Revoke Waiver">
      <template #body>
        <p>This violation will reappear in the list immediately. Continue?</p>
      </template>
      <template #footer="{ close }">
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" label="Cancel" @click="close" />
          <UButton color="error" label="Revoke" :loading="isRevoking" @click="confirmRevoke" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, LicenseViolation } from '~~/types/api'

definePageMeta({ middleware: 'auth' })

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

const columns: TableColumn<LicenseViolation>[] = [
  {
    accessorKey: 'componentName',
    header: ({ column }) => getSortableHeader(column, 'Component'),
    cell: ({ row }) => {
      return h('div', {}, [
        h('strong', {}, row.original.componentName),
        h('br'),
        h('code', { class: 'text-sm' }, row.original.componentVersion)
      ])
    }
  },
  {
    accessorKey: 'licenseId',
    header: ({ column }) => getSortableHeader(column, 'License'),
    cell: ({ row }) => {
      const v = row.original
      return h(NuxtLink, {
        to: `/licenses/${encodeURIComponent(v.licenseId)}`,
        class: 'hover:underline'
      }, () => h(UBadge, {
        color: getCategoryColor(v.licenseCategory || ''),
        variant: 'subtle'
      }, () => v.licenseId))
    }
  },
  {
    accessorKey: 'systemName',
    header: ({ column }) => getSortableHeader(column, 'System'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/systems/${encodeURIComponent(row.original.systemName)}`,
        class: 'hover:underline'
      }, () => row.original.systemName)
    }
  },
  {
    accessorKey: 'systemBusinessCriticality',
    header: ({ column }) => getSortableHeader(column, 'Criticality'),
    cell: ({ row }) => {
      const value = row.original.systemBusinessCriticality
      if (!value) return h('span', { class: 'text-muted' }, '—')
      return h(UBadge, { color: getCriticalityColor(value), variant: 'subtle' }, () => value)
    }
  },
  {
    accessorKey: 'systemEnvironment',
    header: ({ column }) => getSortableHeader(column, 'Environment'),
    cell: ({ row }) => {
      const value = row.original.systemEnvironment
      if (!value) return h('span', { class: 'text-muted' }, '—')
      return h(UBadge, { color: getEnvironmentColor(value), variant: 'subtle' }, () => value)
    }
  },
  {
    accessorKey: 'teamName',
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/teams/${encodeURIComponent(row.original.teamName)}`,
        class: 'hover:underline'
      }, () => row.original.teamName)
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => {
      const v = row.original
      if (v.waiver) {
        return h('div', { class: 'flex items-center gap-2' }, [
          h(UBadge, { color: 'warning', variant: 'subtle' }, () => `Waived until ${new Date(v.waiver!.expiresAt).toLocaleDateString()}`),
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', label: 'Revoke', onClick: () => openRevokeModal(v.waiver!.id) })
        ])
      }
      return h(UButton, {
        size: 'xs',
        color: 'neutral',
        variant: 'outline',
        label: 'Waive',
        onClick: () => openWaiveModal(v)
      })
    }
  }
]

const searchInput = ref('')
const debouncedSearch = ref('')
const showTransitive = ref(false)
const includeWaived = ref(false)

const updateSearch = useDebounceFn((value: string) => { debouncedSearch.value = value }, 300)
watch(searchInput, updateSearch)

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({ resetOn: [debouncedSearch, showTransitive, includeWaived] })

const { data, pending, error } = await useFetch<ApiResponse<LicenseViolation>>('/api/licenses/violations', {
  query: computed(() => ({
    limit: pageSize.value,
    offset: offset.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    search: debouncedSearch.value,
    direct: showTransitive.value ? undefined : 'true',
    includeWaived: includeWaived.value ? 'true' : undefined
  }))
})

const violations = useApiData(data)
const total = useApiCount(data)

// Waive / revoke
const toast = useToast()
const UButton = resolveComponent('UButton')

const showWaiveModal = ref(false)
const isWaiving = ref(false)
const waiveTarget = ref<LicenseViolation | null>(null)
const waiveForm = reactive({ reason: '', expiresAt: defaultExpiryDate() })

function defaultExpiryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}

function openWaiveModal(violation: LicenseViolation) {
  waiveTarget.value = violation
  waiveForm.reason = ''
  waiveForm.expiresAt = defaultExpiryDate()
  showWaiveModal.value = true
}

async function confirmWaive() {
  if (!waiveTarget.value) return
  isWaiving.value = true
  try {
    await $fetch('/api/violations/waivers', {
      method: 'POST',
      body: {
        violationType: 'license',
        naturalKey: {
          systemName: waiveTarget.value.systemName,
          componentPurl: waiveTarget.value.componentPurl ?? `${waiveTarget.value.componentName}@${waiveTarget.value.componentVersion}`,
          licenseId: waiveTarget.value.licenseId
        },
        reason: waiveForm.reason,
        expiresAt: new Date(waiveForm.expiresAt).toISOString()
      }
    })
    showWaiveModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to waive violation', color: 'error' })
  } finally {
    isWaiving.value = false
  }
}

const showRevokeModal = ref(false)
const isRevoking = ref(false)
const revokeTarget = ref('')

function openRevokeModal(waiverId: string) {
  revokeTarget.value = waiverId
  showRevokeModal.value = true
}

async function confirmRevoke() {
  isRevoking.value = true
  try {
    await $fetch(`/api/violations/waivers/${encodeURIComponent(revokeTarget.value)}`, { method: 'DELETE' })
    showRevokeModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to revoke waiver', color: 'error' })
  } finally {
    isRevoking.value = false
  }
}

useHead({ title: 'License Violations - Polaris' })
</script>
