<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Platform"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Platforms" to="/platforms" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="platform">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="platform.name"
          :links="[{ label: 'Back to Platforms', to: '/platforms', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex gap-2">
          <UBadge v-if="platform.type" color="neutral" variant="subtle">
            {{ platform.type }}
          </UBadge>
          <UBadge v-if="platform.domain" color="info" variant="subtle">
            {{ platform.domain }}
          </UBadge>
          <UBadge v-if="timeCategory" :color="getTimeCategoryColor(timeCategory)" variant="subtle">
            {{ timeCategory }}
          </UBadge>
        </div>
      </div>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        description="This is a manually-declared Platform, not a Technology — it has no linked Component and no SBOM evidence of usage. See /docs/concepts for the distinction."
      />

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Basic Information</h2>
        </template>
        <EntityDescriptionList :items="basicInfoItems">
          <template #stewardTeam="{ item }">
            <p class="font-medium mt-0.5">
              <NuxtLink v-if="item.value" :to="`/teams/${encodeURIComponent(String(item.value))}`" class="hover:underline">
                {{ item.value }}
              </NuxtLink>
              <span v-else>—</span>
            </p>
          </template>
        </EntityDescriptionList>
      </UCard>

      <!-- Platform Approvals -->
      <PaginatedTable
        v-model:sorting="approvalSorting"
        :data="platform.approvals ?? []"
        :columns="approvalColumns"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Approvals ({{ platform.approvals?.length || 0 }})</h2>
            <UButton
              v-if="userTeams.length > 0"
              label="Set TIME Category"
              icon="i-lucide-clock"
              size="sm"
              variant="outline"
              @click="openApprovalModal()"
            />
          </div>
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-8">
            No approvals yet.
          </div>
        </template>
      </PaginatedTable>

      <!-- Set TIME Category Modal -->
      <UModal v-model:open="approvalModalOpen">
        <template #header>
          <h3 class="text-lg font-semibold">Set TIME Category</h3>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="submitApproval">
            <UFormField label="Team" required>
              <USelect
                v-model="approvalForm.teamName"
                :items="teamSelectItems"
                placeholder="Select your team"
                @update:model-value="onTeamChange"
              />
            </UFormField>

            <UFormField label="TIME Category" required>
              <USelect
                v-model="approvalForm.time"
                :items="timeItems"
                placeholder="Select TIME category"
              />
            </UFormField>

            <UFormField label="Environment" hint="Leave blank to apply to all environments">
              <USelect
                v-model="approvalForm.environment"
                :items="environmentItems"
                placeholder="All environments"
                @update:model-value="onTeamChange"
              />
            </UFormField>

            <UFormField label="Notes">
              <UTextarea
                v-model="approvalForm.notes"
                placeholder="Reason for this categorization..."
                :rows="3"
              />
            </UFormField>

            <UAlert
              v-if="existingApproval"
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              :description="`This will update the existing '${existingApproval.time}' approval from ${existingApproval.team}.`"
            />

            <UAlert
              v-if="approvalError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="approvalError"
            />
          </form>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" variant="outline" @click="approvalModalOpen = false" />
            <UButton
              label="Save"
              color="primary"
              :loading="approvalSubmitting"
              :disabled="!approvalForm.teamName || !approvalForm.time"
              @click="submitApproval"
            />
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TechnologyApproval } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const approvalSorting = ref([])

const route = useRoute()
const { data: session } = useAuth()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

interface PlatformDetailData {
  name: string
  type: string
  domain: string | null
  vendor: string | null
  stewardTeamName: string | null
  stewardTeamEmail: string | null
  approvals: TechnologyApproval[]
}

interface PlatformResponse {
  success: boolean
  data: PlatformDetailData
}

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

const approvalColumns: TableColumn<TechnologyApproval>[] = [
  {
    accessorKey: 'team',
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => {
      const team = row.getValue('team') as string
      return h(resolveComponent('NuxtLink'), {
        to: `/teams/${encodeURIComponent(team)}`,
        class: 'font-medium hover:underline'
      }, () => team)
    }
  },
  {
    accessorKey: 'time',
    header: ({ column }) => getSortableHeader(column, 'TIME'),
    cell: ({ row }) => {
      const time = row.getValue('time') as string | null
      if (!time) return '—'
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(time), variant: 'subtle' }, () => time)
    }
  },
  {
    accessorKey: 'environment',
    header: ({ column }) => getSortableHeader(column, 'Environment'),
    cell: ({ row }) => {
      const env = row.original.environment
      if (!env) return h('span', { class: 'text-(--ui-text-muted)' }, 'all')
      return h(resolveComponent('UBadge'), { color: getEnvironmentColor(env), variant: 'subtle' }, () => env)
    }
  },
  {
    accessorKey: 'approvedAt',
    header: ({ column }) => getSortableHeader(column, 'Approved'),
    cell: ({ row }) => {
      const date = row.original.approvedAt
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'approvedBy',
    header: ({ column }) => getSortableHeader(column, 'By'),
    cell: ({ row }) => row.original.approvedBy || '—'
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => getSortableHeader(column, 'Notes'),
    cell: ({ row }) => row.original.notes || '—'
  }
]

const { data, pending, error, refresh } = await useFetch<PlatformResponse>(() => `/api/platforms/${encodeURIComponent(route.params.name as string)}`)

const platform = computed(() => data.value?.data || null)

const timeCategory = computed(() => {
  const approval = platform.value?.approvals?.[0]
  return approval?.time || null
})

const basicInfoItems = computed(() => [
  { key: 'type', label: 'Type', value: platform.value?.type },
  { key: 'domain', label: 'Domain', value: platform.value?.domain },
  { key: 'vendor', label: 'Vendor', value: platform.value?.vendor },
  { key: 'stewardTeam', label: 'Steward Team', value: platform.value?.stewardTeamName }
])

// Approval modal state
const approvalModalOpen = ref(false)
const approvalSubmitting = ref(false)
const approvalError = ref('')
const approvalForm = ref({
  teamName: '',
  time: '',
  environment: null as string | null,
  notes: ''
})

const teamSelectItems = computed(() =>
  userTeams.value.map(name => ({ label: name, value: name }))
)

const timeItems = [
  { label: 'Invest — strategic, worth continued investment', value: 'invest' },
  { label: 'Tolerate — keep running, minimize investment', value: 'tolerate' },
  { label: 'Migrate — move to a newer alternative', value: 'migrate' },
  { label: 'Eliminate — phase out and decommission', value: 'eliminate' }
]

const environmentItems = [
  { label: 'All environments', value: null },
  { label: 'dev', value: 'dev' },
  { label: 'test', value: 'test' },
  { label: 'staging', value: 'staging' },
  { label: 'prod', value: 'prod' }
]

const existingApproval = computed(() => {
  if (!approvalForm.value.teamName || !platform.value?.approvals) return null
  const env = approvalForm.value.environment
  return platform.value.approvals.find(a =>
    a.team === approvalForm.value.teamName &&
    (env ? a.environment === env : !a.environment)
  ) || null
})

function onTeamChange() {
  const existing = existingApproval.value
  if (existing) {
    approvalForm.value.time = existing.time || ''
    approvalForm.value.notes = existing.notes || ''
  } else {
    approvalForm.value.time = ''
    approvalForm.value.notes = ''
  }
}

function openApprovalModal() {
  approvalError.value = ''
  approvalForm.value = {
    teamName: userTeams.value.length === 1 ? userTeams.value[0]! : '',
    time: '',
    environment: null,
    notes: ''
  }
  if (userTeams.value.length === 1) {
    onTeamChange()
  }
  approvalModalOpen.value = true
}

async function submitApproval() {
  approvalSubmitting.value = true
  approvalError.value = ''

  try {
    await $fetch(`/api/platforms/${encodeURIComponent(platform.value!.name)}/approvals`, {
      method: 'POST',
      body: {
        teamName: approvalForm.value.teamName,
        time: approvalForm.value.time,
        environment: approvalForm.value.environment || null,
        notes: approvalForm.value.notes || undefined
      }
    })
    approvalModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    approvalError.value = error.data?.message || error.message || 'Failed to set approval'
  } finally {
    approvalSubmitting.value = false
  }
}

useHead({ title: () => `${platform.value?.name || 'Platform'} - Polaris` })
</script>
