<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Compliance Violations"
        description="Teams using technologies without approval or marked for elimination"
      />
      <UButton
        label="Back to Violations"
        to="/violations"
        icon="i-lucide-arrow-left"
        variant="outline"
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
      <EntityStatStrip v-if="summary" :items="summaryStats" />

      <PaginatedTable
        :data="violations"
        :columns="columns"
        :loading="pending"
      >
        <template #header>
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="teamFilter"
              placeholder="Filter by team..."
              icon="i-lucide-search"
              class="max-w-xs"
            />
            <UInput
              v-model="technologyFilter"
              placeholder="Filter by technology..."
              icon="i-lucide-search"
              class="max-w-xs"
            />
            <UCheckbox v-model="showTransitive" label="Include transitive dependencies" />
            <UCheckbox v-model="includeWaived" label="Show waived" />
          </div>
        </template>
        <template #empty>
          <div class="text-center py-8">
            <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
            <h3 class="mt-4">No Compliance Violations!</h3>
            <p class="text-(--ui-text-muted) mt-2">Every team-technology pair in use has been approved.</p>
          </div>
        </template>
      </PaginatedTable>
    </template>

    <UModal v-model:open="showWaiveModal">
      <template #header>
        <h3 class="text-lg font-semibold">Waive Violation</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Reason" required>
            <UTextarea v-model="waiveForm.reason" placeholder="Why is this risk accepted?" class="w-full" autofocus />
          </UFormField>
          <UFormField label="Expires" required hint="Waivers cannot be indefinite — pick a re-review date">
            <UInput v-model="waiveForm.expiresAt" type="date" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" label="Cancel" @click="showWaiveModal = false" />
          <UButton color="primary" label="Waive" :loading="isWaiving" @click="confirmWaive" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showRevokeModal">
      <template #header>
        <h3 class="text-lg font-semibold">Revoke Waiver</h3>
      </template>
      <template #body>
        <p>This violation will reappear in the list immediately. Continue?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" label="Cancel" @click="showRevokeModal = false" />
          <UButton color="error" label="Revoke" :loading="isRevoking" @click="confirmRevoke" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: 'auth' })

interface ComplianceViolation {
  team: string
  technology: string
  type: string
  systemCount: number
  systems: string[]
  violationType: string
  notes: string | null
  migrationTarget: string | null
  waiver: { id: string; reason: string; expiresAt: string } | null
}

interface ComplianceViolationsSummary {
  totalViolations: number
  teamsAffected: number
  byTeam: Array<{ team: string; violationCount: number; systemsAffected: number }>
}

interface ComplianceViolationsResponse {
  success: boolean
  data: { violations: ComplianceViolation[]; summary: ComplianceViolationsSummary }
}

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const NuxtLink = resolveComponent('NuxtLink')

const teamFilter = ref('')
const technologyFilter = ref('')
const showTransitive = ref(false)
const includeWaived = ref(false)

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (!showTransitive.value) params.direct = 'true'
  if (includeWaived.value) params.includeWaived = 'true'
  return params
})

const { data, pending, error } = await useFetch<ComplianceViolationsResponse>('/api/compliance/violations', {
  query: queryParams
})

const allViolations = computed(() => data.value?.data?.violations ?? [])
const violations = computed(() => allViolations.value.filter(v =>
  (!teamFilter.value || v.team.toLowerCase().includes(teamFilter.value.toLowerCase())) &&
  (!technologyFilter.value || v.technology.toLowerCase().includes(technologyFilter.value.toLowerCase()))
))
const summary = computed(() => data.value?.data?.summary)
const summaryStats = computed(() => summary.value
  ? [
      { label: 'Total Violations', value: summary.value.totalViolations },
      { label: 'Teams Affected', value: summary.value.teamsAffected }
    ]
  : [])

function violationTypeColor(violationType: string): 'error' | 'warning' {
  return violationType === 'eliminated' ? 'error' : 'warning'
}

const columns: TableColumn<ComplianceViolation>[] = [
  {
    id: 'technology',
    accessorFn: row => row.technology,
    header: ({ column }) => getSortableHeader(column, 'Technology'),
    cell: ({ row }) => h(NuxtLink, {
      to: `/technologies/${encodeURIComponent(row.original.technology)}`,
      class: 'hover:underline'
    }, () => row.original.technology)
  },
  {
    id: 'violationType',
    accessorFn: row => row.violationType,
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => h(UBadge, {
      color: violationTypeColor(row.original.violationType),
      variant: 'subtle'
    }, () => row.original.violationType)
  },
  {
    id: 'team',
    accessorFn: row => row.team,
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => h(NuxtLink, {
      to: `/teams/${encodeURIComponent(row.original.team)}`,
      class: 'hover:underline'
    }, () => row.original.team)
  },
  {
    id: 'systemCount',
    accessorFn: row => row.systemCount,
    header: ({ column }) => getSortableHeader(column, 'Systems'),
    cell: ({ row }) => `${row.original.systemCount} system${row.original.systemCount === 1 ? '' : 's'}`
  },
  {
    id: 'migrationTarget',
    accessorFn: row => row.migrationTarget ?? '',
    header: 'Migration Target',
    cell: ({ row }) => row.original.migrationTarget || h('span', { class: 'text-(--ui-text-muted)' }, '—')
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

// Waive / revoke
const toast = useToast()

const showWaiveModal = ref(false)
const isWaiving = ref(false)
const waiveTarget = ref<ComplianceViolation | null>(null)
const waiveForm = reactive({ reason: '', expiresAt: defaultExpiryDate() })

function defaultExpiryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}

function openWaiveModal(violation: ComplianceViolation) {
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
        violationType: 'compliance',
        naturalKey: {
          teamName: waiveTarget.value.team,
          technologyName: waiveTarget.value.technology
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

useHead({ title: 'Compliance Violations - Polaris' })
</script>
