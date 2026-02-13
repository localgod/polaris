<template>
  <div class="space-y-6">
    <UPageHeader
      title="Technologies"
      description="Governed technology choices across the organization"
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
      <UCard>
        <UTable
          :data="technologies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No technologies found.
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

    <UModal v-model:open="deleteModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Technology</h3>
      </template>
      <template #body>
        <p>
          Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?
          This will remove the technology and all its relationships.
        </p>
        <UAlert
          v-if="deleteError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="deleteError"
          class="mt-4"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" @click="deleteModalOpen = false" />
          <UButton
            label="Delete"
            color="error"
            :loading="deleteLoading"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Technology } from '~~/types/api'

const { data: session } = useAuth()

const isSuperuser = computed(() => session.value?.user?.role === 'superuser')
const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

function canDeleteTechnology(tech: Technology): boolean {
  if (isSuperuser.value) return true
  if (!tech.ownerTeamName) return false
  return userTeams.value.includes(tech.ownerTeamName)
}

function getTimeCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    invest: 'success',
    tolerate: 'warning',
    migrate: 'warning',
    eliminate: 'error'
  }
  return colors[category?.toLowerCase()] || 'neutral'
}

const columns: TableColumn<Technology>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const tech = row.original
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(tech.name)}`,
        class: 'font-medium hover:underline'
      }, () => tech.name)
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string | undefined
      if (!category) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => category)
    }
  },
  {
    id: 'time',
    header: 'TIME',
    cell: ({ row }) => {
      const approvals = (row.original.approvals || []).filter((a: { team?: string; time?: string }) => a.team && a.time)
      if (approvals.length === 0) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('div', { class: 'flex flex-wrap gap-1' }, approvals.map((a: { team: string; time: string }) =>
        h(resolveComponent('UTooltip'), { text: a.team }, {
          default: () => h(resolveComponent('UBadge'), { color: getTimeCategoryColor(a.time), variant: 'subtle', size: 'xs' }, () => `${a.team}: ${a.time}`)
        })
      ))
    }
  },
  {
    accessorKey: 'ownerTeam',
    header: 'Owner',
    cell: ({ row }) => {
      const team = row.getValue('ownerTeam') as string | undefined
      if (!team) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return team
    }
  },
  {
    id: 'versions',
    header: 'Versions',
    cell: ({ row }) => String(row.original.versions?.length ?? 0)
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const tech = row.original
      const viewGroup = [
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/technologies/${encodeURIComponent(tech.name)}`) }
      ]
      const items: { label: string; icon: string; onSelect: () => void }[][] = [viewGroup]

      if (canDeleteTechnology(tech)) {
        items.push([
          { label: 'Delete', icon: 'i-lucide-trash-2', onSelect: () => openDeleteModal(tech.name) }
        ])
      }

      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

// Delete modal state
const deleteModalOpen = ref(false)
const deleteTarget = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')

function openDeleteModal(name: string) {
  deleteTarget.value = name
  deleteError.value = ''
  deleteModalOpen.value = true
}

async function confirmDelete() {
  deleteLoading.value = true
  deleteError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(deleteTarget.value)}`, {
      method: 'DELETE'
    })
    deleteModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    deleteError.value = error.data?.message || error.message || 'Failed to delete technology'
  } finally {
    deleteLoading.value = false
  }
}

const page = ref(1)
const pageSize = 20
const queryParams = computed(() => ({ limit: pageSize, offset: (page.value - 1) * pageSize }))

const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies', { query: queryParams })

const technologies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Technologies - Polaris' })
</script>
