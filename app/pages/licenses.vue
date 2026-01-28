<template>
  
    <div class="space-y">
      <div class="page-header">
        <h1>License Inventory</h1>
        <p>Licenses discovered in components across all systems</p>
      </div>

      <UiCard v-if="error || deniedError">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error?.message || deniedError?.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else>
        <!-- Licenses Table -->
        <UiCard>
          <UTable
            :data="licenses"
            :columns="columns"
            :loading="pending || deniedPending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No licenses found.
              </div>
            </template>
          </UTable>

          <div v-if="total > pageSize" class="flex justify-center border-t border-default pt-4 mt-4">
            <UPagination
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
              :sibling-count="1"
              show-edges
            />
          </div>
        </UiCard>
      </template>
    </div>
  
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface License {
  spdxId: string
  name: string
  category: string
  osiApproved: boolean
  componentCount: number
}

interface LicenseResponse {
  success: boolean
  data: License[]
  count: number
  total?: number
}

interface DeniedResponse {
  success: boolean
  deniedLicenses: string[]
}

const UiBadge = resolveComponent('UiBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<LicenseResponse>('/api/licenses', {
  query: queryParams
})
const { data: deniedData, pending: deniedPending, error: deniedError, refresh: refreshDenied } = await useFetch<DeniedResponse>('/api/licenses/denied')

const total = computed(() => data.value?.total || data.value?.count || 0)

const licenses = computed(() => data.value?.data || [])
const deniedLicenses = computed(() => deniedData.value?.deniedLicenses || [])
const togglingLicense = ref<string | null>(null)

function isLicenseDenied(spdxId: string): boolean {
  return deniedLicenses.value.includes(spdxId)
}

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
}

async function toggleLicense(spdxId: string) {
  togglingLicense.value = spdxId
  
  try {
    const isDenied = isLicenseDenied(spdxId)
    const endpoint = isDenied 
      ? `/api/licenses/${encodeURIComponent(spdxId)}/allow`
      : `/api/licenses/${encodeURIComponent(spdxId)}/deny`
    
    await $fetch(endpoint, { method: 'POST' })
    await refreshDenied()
  } catch (err) {
    console.error('Failed to toggle license:', err)
  } finally {
    togglingLicense.value = null
  }
}

const columns: TableColumn<License>[] = [
  {
    accessorKey: 'name',
    header: 'License'
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      return h(UiBadge, { variant: getCategoryVariant(category) }, () => category)
    }
  },
  {
    accessorKey: 'osiApproved',
    header: 'OSI',
    cell: ({ row }) => {
      const osiApproved = row.getValue('osiApproved') as boolean
      return h(UiBadge, { variant: osiApproved ? 'success' : 'neutral' }, () => osiApproved ? 'Yes' : 'No')
    }
  },
  {
    accessorKey: 'componentCount',
    header: 'Components'
  },
  {
    id: 'policyStatus',
    header: 'Policy Status',
    cell: ({ row }) => {
      const spdxId = row.original.spdxId
      const isDenied = isLicenseDenied(spdxId)
      const isToggling = togglingLicense.value === spdxId

      return h('button', {
        class: ['toggle-btn', isDenied ? 'toggle-denied' : ''],
        disabled: isToggling,
        onClick: () => toggleLicense(spdxId)
      }, [
        h('span', { class: 'toggle-slider' }),
        h('span', { class: 'toggle-label' }, isToggling ? '...' : (isDenied ? 'Denied' : 'Allowed'))
      ])
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
      const license = row.original
      const isDenied = isLicenseDenied(license.spdxId)

      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/licenses/${encodeURIComponent(license.spdxId)}`)
          },
          {
            label: 'View Components',
            icon: 'i-lucide-package',
            onSelect: () => navigateTo(`/components?license=${encodeURIComponent(license.spdxId)}`)
          }
        ],
        [
          {
            label: isDenied ? 'Allow License' : 'Deny License',
            icon: isDenied ? 'i-lucide-check' : 'i-lucide-ban',
            color: isDenied ? 'success' : 'error',
            onSelect: () => toggleLicense(license.spdxId)
          }
        ]
      ]

      return h(UDropdownMenu, {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
  }
]

useHead({ title: 'Licenses - Polaris' })
</script>

<style scoped>
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: #dcfce7;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 5.5rem;
}

.toggle-btn:hover:not(:disabled) {
  border-color: #9ca3af;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-btn.toggle-denied {
  background: #fee2e2;
}

.toggle-slider {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #16a34a;
  transition: all 0.2s;
}

.toggle-denied .toggle-slider {
  background: #dc2626;
}

.toggle-label {
  color: #15803d;
}

.toggle-denied .toggle-label {
  color: #b91c1c;
}
</style>
