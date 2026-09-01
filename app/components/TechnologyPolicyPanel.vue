<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Organization Policy</h2>
        <div class="flex items-center gap-2">
          <UButton
            v-if="canPropose"
            :label="latestDraft ? 'Update Draft' : 'Propose Policy'"
            icon="i-lucide-pencil"
            size="sm"
            variant="outline"
            :loading="loading"
            @click="openProposeModal"
          />
          <UButton
            v-if="canManage && latestDraft"
            label="Activate"
            icon="i-lucide-check-circle"
            size="sm"
            color="success"
            variant="outline"
            :loading="loading"
            @click="confirmActivate"
          />
          <UButton
            v-if="canManage && (activePolicy || latestDraft)"
            label="Archive"
            icon="i-lucide-archive"
            size="sm"
            color="neutral"
            variant="ghost"
            :loading="loading"
            @click="confirmArchive"
          />
        </div>
      </div>
    </template>

    <!-- No policy state -->
    <div v-if="!activePolicy && !latestDraft && !historyPending" class="text-center py-8">
      <UIcon name="i-lucide-shield-off" class="size-10 text-(--ui-text-muted) mb-3 mx-auto" />
      <p class="text-sm font-medium text-(--ui-text)">No policy set</p>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        This technology is <span class="font-semibold text-(--ui-error)">unclassified</span> — it counts as a compliance violation.
      </p>
      <UButton
        v-if="canPropose"
        label="Propose Policy"
        icon="i-lucide-plus"
        size="sm"
        variant="outline"
        class="mt-4"
        @click="openProposeModal"
      />
    </div>

    <USkeleton v-else-if="historyPending" class="h-24 w-full" />

    <!-- Policy card -->
    <div v-else class="space-y-4">
      <!-- Draft notice -->
      <UAlert
        v-if="latestDraft && !activePolicy"
        color="warning"
        variant="subtle"
        icon="i-lucide-clock"
        title="Draft policy pending activation"
        description="This draft is not yet authoritative. An org-admin must activate it before it affects compliance."
      />
      <UAlert
        v-else-if="latestDraft && activePolicy"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="New draft available"
        description="A newer draft policy exists and is waiting for activation."
      />

      <!-- Active policy details -->
      <template v-if="displayPolicy">
        <div class="flex items-start gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <UBadge :color="getTimeCategoryColor(displayPolicy.time)" size="lg" class="text-base px-3 py-1">
              {{ displayPolicy.time }}
            </UBadge>
            <UBadge v-if="displayPolicy.status === 'draft'" color="warning" variant="outline" size="sm">draft</UBadge>
            <UBadge v-else-if="displayPolicy.status === 'active'" color="success" variant="outline" size="sm">active</UBadge>
          </div>
        </div>

        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="displayPolicy.rationale">
            <dt class="text-(--ui-text-muted) font-medium">Rationale</dt>
            <dd class="mt-0.5">{{ displayPolicy.rationale }}</dd>
          </div>
          <div v-if="displayPolicy.migrationTarget">
            <dt class="text-(--ui-text-muted) font-medium">Migration target</dt>
            <dd class="mt-0.5">{{ displayPolicy.migrationTarget }}</dd>
          </div>
          <div v-if="displayPolicy.effectiveDate">
            <dt class="text-(--ui-text-muted) font-medium">Effective</dt>
            <dd class="mt-0.5">{{ formatDate(displayPolicy.effectiveDate) }}</dd>
          </div>
          <div v-if="displayPolicy.expiryDate">
            <dt class="text-(--ui-text-muted) font-medium">Expires</dt>
            <dd class="mt-0.5">{{ formatDate(displayPolicy.expiryDate) }}</dd>
          </div>
          <div>
            <dt class="text-(--ui-text-muted) font-medium">Set by</dt>
            <dd class="mt-0.5">{{ displayPolicy.createdByName || displayPolicy.createdBy }}</dd>
          </div>
          <div>
            <dt class="text-(--ui-text-muted) font-medium">Last updated</dt>
            <dd class="mt-0.5">{{ formatDate(displayPolicy.updatedAt) }}</dd>
          </div>
        </dl>
      </template>

      <!-- Exceptions (active policy only) -->
      <template v-if="activePolicy">
        <div class="border-t border-(--ui-border) pt-4 mt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">
              Exceptions ({{ (activePolicy.exceptions ?? []).length }})
            </h3>
            <UButton
              v-if="canManage"
              label="Create Exception"
              icon="i-lucide-plus"
              size="xs"
              variant="outline"
              @click="openExceptionModal"
            />
          </div>
          <div v-if="(activePolicy.exceptions ?? []).length === 0" class="text-sm text-(--ui-text-muted)">
            No active exceptions.
          </div>
          <UTable
            v-else
            :data="activePolicy.exceptions ?? []"
            :columns="exceptionColumns"
          />
        </div>
      </template>
    </div>

    <!-- Propose / Update draft modal -->
    <UModal v-model:open="proposeModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">{{ latestDraft ? 'Update Draft Policy' : 'Propose Policy' }}</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="submitPropose">
          <UFormField label="TIME Classification" required>
            <USelect v-model="proposeForm.time" :items="timeOptions" placeholder="Select TIME value" />
          </UFormField>
          <UFormField label="Rationale">
            <UTextarea v-model="proposeForm.rationale" placeholder="Why this classification?" :rows="3" />
          </UFormField>
          <UFormField v-if="proposeForm.time === 'migrate'" label="Migration target">
            <UInput v-model="proposeForm.migrationTarget" placeholder="Which technology to migrate to?" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Effective date">
              <UInput v-model="proposeForm.effectiveDate" type="date" />
            </UFormField>
            <UFormField label="Expiry date">
              <UInput v-model="proposeForm.expiryDate" type="date" />
            </UFormField>
          </div>
          <UAlert v-if="proposeError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="proposeError" />
        </form>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="proposeModalOpen = false" />
        <UButton
          :label="latestDraft ? 'Update Draft' : 'Propose'"
          color="primary"
          :loading="loading"
          :disabled="!proposeForm.time"
          @click="submitPropose"
        />
      </template>
    </UModal>

    <!-- Create exception modal -->
    <UModal v-model:open="exceptionModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Create Policy Exception</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="submitException">
          <UFormField label="Overriding TIME value" required>
            <USelect v-model="exceptionForm.time" :items="timeOptions" placeholder="Select TIME value" />
          </UFormField>
          <UFormField label="Reason" required>
            <UTextarea v-model="exceptionForm.reason" placeholder="Why is this exception needed?" :rows="2" />
          </UFormField>
          <UFormField label="Approver" required>
            <UInput v-model="exceptionForm.approver" placeholder="Name or email of approver" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Scope" required>
              <USelect v-model="exceptionForm.scope" :items="scopeOptions" placeholder="team or system" />
            </UFormField>
            <UFormField label="Scope name" required>
              <UInput v-model="exceptionForm.scopeName" :placeholder="exceptionForm.scope === 'system' ? 'System name' : 'Team name'" />
            </UFormField>
          </div>
          <UFormField label="Environment">
            <USelect v-model="exceptionForm.environment" :items="environmentOptions" placeholder="All environments" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Effective date" required>
              <UInput v-model="exceptionForm.effectiveDate" type="date" />
            </UFormField>
            <UFormField label="Expires at" required>
              <UInput v-model="exceptionForm.expiresAt" type="date" />
            </UFormField>
          </div>
          <UAlert v-if="exceptionError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="exceptionError" />
        </form>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="exceptionModalOpen = false" />
        <UButton
          label="Create Exception"
          color="primary"
          :loading="loading"
          :disabled="!exceptionForm.time || !exceptionForm.reason || !exceptionForm.approver || !exceptionForm.scope || !exceptionForm.scopeName || !exceptionForm.effectiveDate || !exceptionForm.expiresAt"
          @click="submitException"
        />
      </template>
    </UModal>

    <!-- Activate confirmation modal -->
    <UModal v-model:open="activateModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Activate Policy</h3>
      </template>
      <template #body>
        <p class="text-sm">
          Activating this draft policy will make
          <UBadge :color="getTimeCategoryColor(latestDraft?.time)" class="mx-1">{{ latestDraft?.time }}</UBadge>
          the authoritative org-level TIME classification for <strong>{{ technologyName }}</strong>.
          Any previously active policy will be archived automatically.
        </p>
        <UAlert v-if="activateError" color="error" variant="subtle" icon="i-lucide-alert-circle" class="mt-3" :description="activateError" />
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="activateModalOpen = false" />
        <UButton label="Activate Policy" color="success" :loading="loading" @click="submitActivate" />
      </template>
    </UModal>

    <!-- Archive confirmation modal -->
    <UModal v-model:open="archiveModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Archive Policy</h3>
      </template>
      <template #body>
        <p class="text-sm">
          Archiving will remove the active policy for <strong>{{ technologyName }}</strong>.
          The technology will be <strong class="text-(--ui-error)">unclassified</strong> (compliance violation) until a new policy is activated.
        </p>
        <UAlert v-if="archiveError" color="error" variant="subtle" icon="i-lucide-alert-circle" class="mt-3" :description="archiveError" />
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="archiveModalOpen = false" />
        <UButton label="Archive" color="warning" :loading="loading" @click="submitArchive" />
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TechnologyPolicy, PolicyException } from '~~/types/api'

const props = defineProps<{
  technologyName: string
  stewardTeamName: string | null | undefined
}>()

const emit = defineEmits<{ refreshed: [] }>()

const { data: session } = useAuth()
const { isOrgAdmin } = useEffectiveRole()
const toast = useToast()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) ?? []
)

const canPropose = computed(() =>
  isOrgAdmin.value || (!!props.stewardTeamName && userTeams.value.includes(props.stewardTeamName))
)
const canManage = computed(() => isOrgAdmin.value)

// ── Policy data ────────────────────────────────────────────────────────────────

interface PolicyHistoryResponse { success: boolean; data: TechnologyPolicy[] }
const { data: historyResponse, pending: historyPending, refresh: refreshHistory } = useFetch<PolicyHistoryResponse>(
  () => `/api/technologies/${encodeURIComponent(props.technologyName)}/policy/history`
)

const history = computed(() => historyResponse.value?.data ?? [])
const activePolicy = computed(() => history.value.find(p => p.status === 'active') ?? null)
const latestDraft = computed(() => history.value.find(p => p.status === 'draft') ?? null)
const displayPolicy = computed(() => activePolicy.value ?? latestDraft.value)

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

const timeOptions = [
  { label: 'Invest — strategic, worth continued investment', value: 'invest' },
  { label: 'Tolerate — keep running, minimize investment', value: 'tolerate' },
  { label: 'Migrate — move to a newer alternative', value: 'migrate' },
  { label: 'Eliminate — phase out and decommission', value: 'eliminate' },
]
const scopeOptions = [
  { label: 'Team', value: 'team' },
  { label: 'System', value: 'system' },
]
const environmentOptions = [
  { label: 'All environments', value: null },
  { label: 'dev', value: 'dev' },
  { label: 'test', value: 'test' },
  { label: 'staging', value: 'staging' },
  { label: 'prod', value: 'prod' },
]

// ── Exception table columns ────────────────────────────────────────────────────

const exceptionColumns: TableColumn<PolicyException>[] = [
  {
    accessorKey: 'time',
    header: 'TIME',
    cell: ({ row }) => {
      const time = row.original.time
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(time), variant: 'subtle', size: 'sm' }, () => time)
    }
  },
  {
    accessorKey: 'scopeName',
    header: 'Scope',
    cell: ({ row }) => `${row.original.scope}: ${row.original.scopeName}`
  },
  { accessorKey: 'reason', header: 'Reason' },
  {
    accessorKey: 'expiresAt',
    header: 'Expires',
    cell: ({ row }) => formatDate(row.original.expiresAt)
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      if (!canManage.value) return null
      return h(resolveComponent('UButton'), {
        label: 'Revoke',
        size: 'xs',
        color: 'error',
        variant: 'ghost',
        onClick: () => revokeException(row.original.id)
      })
    }
  }
]

// ── Shared loading/error ───────────────────────────────────────────────────────

const loading = ref(false)

// ── Propose / update draft ─────────────────────────────────────────────────────

const proposeModalOpen = ref(false)
const proposeError = ref('')
const proposeForm = ref({
  time: '',
  rationale: '',
  migrationTarget: '',
  effectiveDate: '',
  expiryDate: '',
})

function openProposeModal() {
  const draft = latestDraft.value ?? activePolicy.value
  proposeForm.value = {
    time: draft?.time ?? '',
    rationale: draft?.rationale ?? '',
    migrationTarget: draft?.migrationTarget ?? '',
    effectiveDate: draft?.effectiveDate?.split('T')[0] ?? '',
    expiryDate: draft?.expiryDate?.split('T')[0] ?? '',
  }
  proposeError.value = ''
  proposeModalOpen.value = true
}

async function submitPropose() {
  loading.value = true
  proposeError.value = ''
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.technologyName)}/policy`, {
      method: 'POST',
      body: {
        time: proposeForm.value.time,
        rationale: proposeForm.value.rationale || null,
        migrationTarget: proposeForm.value.migrationTarget || null,
        effectiveDate: proposeForm.value.effectiveDate || null,
        expiryDate: proposeForm.value.expiryDate || null,
      }
    })
    proposeModalOpen.value = false
    await refreshHistory()
    toast.add({ title: 'Draft policy saved', color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    proposeError.value = e.data?.message ?? e.message ?? 'Failed to save draft'
  } finally {
    loading.value = false
  }
}

// ── Activate ───────────────────────────────────────────────────────────────────

const activateModalOpen = ref(false)
const activateError = ref('')

function confirmActivate() {
  activateError.value = ''
  activateModalOpen.value = true
}

async function submitActivate() {
  if (!latestDraft.value) return
  loading.value = true
  activateError.value = ''
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.technologyName)}/policy/activate`, {
      method: 'POST',
      body: { policyId: latestDraft.value.id }
    })
    activateModalOpen.value = false
    await refreshHistory()
    emit('refreshed')
    toast.add({ title: 'Policy activated', color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    activateError.value = e.data?.message ?? e.message ?? 'Failed to activate policy'
  } finally {
    loading.value = false
  }
}

// ── Archive ────────────────────────────────────────────────────────────────────

const archiveModalOpen = ref(false)
const archiveError = ref('')

function confirmArchive() {
  archiveError.value = ''
  archiveModalOpen.value = true
}

async function submitArchive() {
  const toArchive = activePolicy.value ?? latestDraft.value
  if (!toArchive) return
  loading.value = true
  archiveError.value = ''
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.technologyName)}/policy/archive`, {
      method: 'POST',
      body: { policyId: toArchive.id }
    })
    archiveModalOpen.value = false
    await refreshHistory()
    emit('refreshed')
    toast.add({ title: 'Policy archived', color: 'neutral' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    archiveError.value = e.data?.message ?? e.message ?? 'Failed to archive policy'
  } finally {
    loading.value = false
  }
}

// ── Create exception ───────────────────────────────────────────────────────────

const exceptionModalOpen = ref(false)
const exceptionError = ref('')
const exceptionForm = ref({
  time: '',
  reason: '',
  approver: '',
  scope: 'team',
  scopeName: '',
  environment: null as string | null,
  effectiveDate: '',
  expiresAt: '',
})

function openExceptionModal() {
  exceptionForm.value = {
    time: '',
    reason: '',
    approver: '',
    scope: 'team',
    scopeName: '',
    environment: null,
    effectiveDate: new Date().toISOString().split('T')[0]!,
    expiresAt: '',
  }
  exceptionError.value = ''
  exceptionModalOpen.value = true
}

async function submitException() {
  loading.value = true
  exceptionError.value = ''
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.technologyName)}/policy/exceptions`, {
      method: 'POST',
      body: { ...exceptionForm.value }
    })
    exceptionModalOpen.value = false
    await refreshHistory()
    toast.add({ title: 'Exception created', color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    exceptionError.value = e.data?.message ?? e.message ?? 'Failed to create exception'
  } finally {
    loading.value = false
  }
}

// ── Revoke exception ───────────────────────────────────────────────────────────

async function revokeException(exceptionId: string) {
  loading.value = true
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.technologyName)}/policy/exceptions/${exceptionId}`, {
      method: 'DELETE'
    })
    await refreshHistory()
    toast.add({ title: 'Exception revoked', color: 'neutral' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Failed to revoke exception', description: e.data?.message ?? e.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>
