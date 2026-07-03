<template>
  <div class="space-y-6">
    <UPageHeader
      title="Component Link Queue"
      :description="`${total} component${total === 1 ? '' : 's'} awaiting a Technology link`"
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      description="This queue is the only way to create a new Technology. A Technology must always be backed by at least one directly-used Component discovered via SBOM scanning — for infrastructure that can never be observed this way (databases, cloud services, etc.), declare a Platform instead."
    />

    <UAlert
      v-if="deepLinkNotFound"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="`Component '${deepLinkNotFound}' isn't in this queue`"
      description="It may already be linked, dismissed, not a direct dependency of any system, or simply not on this page — search or paginate below to find it."
      close
      @close="deepLinkNotFound = ''"
    />

    <UAlert
      v-if="fetchError"
      color="error"
      :title="fetchError.message || 'Failed to load suggestions'"
      icon="i-lucide-circle-x"
    />

    <UAlert
      v-if="dismissError"
      color="error"
      title="Failed to dismiss component"
      :description="dismissError"
      icon="i-lucide-circle-x"
      close
      @close="dismissError = ''"
    />

    <UCard v-else>
      <UTable
        :data="suggestions"
        :columns="columns"
        :loading="pending"
      >
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No unlinked components — all caught up!
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

    <!-- Confirm link / create modal -->
    <UModal v-model:open="confirmModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Link Component to Technology</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="text-sm text-(--ui-text-muted)">
            Component: <code>{{ confirmItem?.name }}</code>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Technology</label>
            <UInput
              v-model="techSearch"
              placeholder="Type to search technologies…"
              icon="i-lucide-search"
              @input="onTechSearchInput"
            />
          </div>

          <div v-if="techSearchResults.length > 0" class="max-h-52 overflow-y-auto border border-(--ui-border) rounded-md divide-y divide-(--ui-border)">
            <UButton
              v-for="name in techSearchResults"
              :key="name"
              variant="ghost"
              color="neutral"
              class="w-full justify-start px-3 py-2"
              :class="{ 'bg-(--ui-bg-elevated)': selectedTech === name }"
              @click="selectExisting(name)"
            >
              {{ name }}
            </UButton>
          </div>

          <div v-if="selectedTech" class="text-sm">
            Linking to existing technology: <strong>{{ selectedTech }}</strong>
          </div>

          <template v-else-if="techSearch.trim().length >= 2 && techSearchResults.length === 0">
            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-sparkles"
              :title="`No technology named '${techSearch.trim()}' exists`"
              description="Create it from this component instead."
            />

            <div class="space-y-4 border border-(--ui-border) rounded-md p-4">
              <UFormField label="Type" required>
                <USelect v-model="createForm.type" :items="typeItems" placeholder="Select a type" />
              </UFormField>
              <UFormField label="Domain">
                <USelect v-model="createForm.domain" :items="domainItems" placeholder="Select a domain (optional)" />
              </UFormField>
              <UFormField label="Vendor">
                <UInput v-model="createForm.vendor" placeholder="e.g., Meta, Google" />
              </UFormField>
              <UFormField label="Owner Team">
                <USelect v-model="createForm.ownerTeam" :items="teamItems" placeholder="Select a team (optional)" />
              </UFormField>
            </div>
          </template>

          <UAlert
            v-if="confirmError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="confirmError"
          />
        </div>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="confirmModalOpen = false" />
        <UButton
          v-if="selectedTech"
          :loading="confirmLoading"
          :label="confirmLoading ? 'Linking…' : 'Confirm Link'"
          @click="submitConfirmLink"
        />
        <UButton
          v-else
          :loading="confirmLoading"
          :label="confirmLoading ? 'Creating…' : `Create '${techSearch.trim()}' & Link`"
          :disabled="techSearch.trim().length < 2 || !createForm.type"
          @click="submitCreateNew"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface LinkSuggestion {
  name: string
  packageManager: string | null
  purlName: string
  suggestedTechnologies: string[]
  hasExactMatch: boolean
}

interface SuggestionsResponse {
  success: boolean
  data: LinkSuggestion[]
  count: number
  total: number
}

interface TechnologiesResponse {
  success: boolean
  data: Array<{ name: string }>
  count: number
}

interface TeamsResponse {
  success: boolean
  data: { name: string }[]
  count: number
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

const page = ref(1)
const pageSize = 50

const queryParams = computed(() => ({
  skip: (page.value - 1) * pageSize,
  limit: pageSize
}))

const { data, pending, error: fetchError, refresh } = await useFetch<SuggestionsResponse>(
  '/api/components/link-suggestions',
  { query: queryParams }
)

const suggestions = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)

// Deep-link support: ComponentVersionsModal's "Create Technology" action
// links here with ?component=<name> to jump straight into the confirm flow.
// Only attempted once on initial load — not re-triggered by later refreshes.
const route = useRoute()
const deepLinkNotFound = ref('')
let deepLinkAttempted = false

watch(suggestions, (items) => {
  const target = route.query.component as string | undefined
  if (!target || deepLinkAttempted || pending.value) return
  deepLinkAttempted = true
  const match = items.find(item => item.name === target)
  if (match) {
    openConfirmModal(match)
  } else {
    deepLinkNotFound.value = target
  }
}, { immediate: true })

const columns: TableColumn<LinkSuggestion>[] = [
  {
    accessorKey: 'name',
    header: 'Component',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
  },
  {
    accessorKey: 'packageManager',
    header: 'Ecosystem',
    cell: ({ row }) => row.getValue('packageManager') ?? '—'
  },
  {
    accessorKey: 'suggestedTechnologies',
    header: 'Suggestions',
    cell: ({ row }) => {
      const item = row.original
      const techs = item.suggestedTechnologies
      if (!techs?.length) return h('span', { class: 'text-(--ui-text-muted) text-sm' }, 'None')
      return h('div', { class: 'flex flex-wrap gap-1' }, techs.slice(0, 3).map(name =>
        h(UBadge, {
          key: name,
          color: item.hasExactMatch && name === techs[0] ? 'success' : 'neutral',
          variant: 'subtle',
          size: 'sm'
        }, () => name)
      ))
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          size: 'xs',
          label: 'Confirm',
          icon: 'i-lucide-link',
          onClick: () => openConfirmModal(item)
        }),
        h(UTooltip, { text: 'Dismiss from queue' }, () =>
          h(UButton, {
            size: 'xs',
            color: 'neutral',
            variant: 'outline',
            icon: 'i-lucide-x',
            onClick: () => dismissItem(item)
          })
        )
      ])
    }
  }
]

// Confirm / create modal
const confirmModalOpen = ref(false)
const confirmItem = ref<LinkSuggestion | null>(null)
const selectedTech = ref('')
const techSearch = ref('')
const techSearchResults = ref<string[]>([])
const confirmLoading = ref(false)
const confirmError = ref('')

const createForm = reactive({
  type: '',
  domain: '',
  vendor: '',
  ownerTeam: ''
})

const typeItems = [
  { label: 'Application', value: 'application' },
  { label: 'Framework', value: 'framework' },
  { label: 'Library', value: 'library' },
  { label: 'Container', value: 'container' },
  { label: 'Platform', value: 'platform' },
  { label: 'Operating System', value: 'operating-system' },
  { label: 'Device', value: 'device' },
  { label: 'Device Driver', value: 'device-driver' },
  { label: 'Firmware', value: 'firmware' },
  { label: 'File', value: 'file' },
  { label: 'Machine Learning Model', value: 'machine-learning-model' },
  { label: 'Data', value: 'data' }
]

const domainItems = [
  { label: 'Foundational Runtime', value: 'foundational-runtime' },
  { label: 'Framework', value: 'framework' },
  { label: 'Data Platform', value: 'data-platform' },
  { label: 'Integration Platform', value: 'integration-platform' },
  { label: 'Security & Identity', value: 'security-identity' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Observability', value: 'observability' },
  { label: 'Developer Tooling', value: 'developer-tooling' },
  { label: 'Other', value: 'other' }
]

const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'component-links-teams' })
const teamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

let techSearchTimer: ReturnType<typeof setTimeout> | null = null

function openConfirmModal(item: LinkSuggestion) {
  confirmItem.value = item
  selectedTech.value = item.suggestedTechnologies[0] ?? ''
  techSearch.value = selectedTech.value
  techSearchResults.value = []
  confirmError.value = ''
  Object.assign(createForm, { type: '', domain: '', vendor: '', ownerTeam: '' })
  confirmModalOpen.value = true
}

function selectExisting(name: string) {
  selectedTech.value = name
  techSearch.value = name
  techSearchResults.value = []
}

function onTechSearchInput() {
  selectedTech.value = ''
  if (techSearchTimer) clearTimeout(techSearchTimer)
  const val = techSearch.value.trim()
  if (val.length < 2) {
    techSearchResults.value = []
    return
  }
  techSearchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<TechnologiesResponse>('/api/technologies', {
        query: { search: val, limit: 10 }
      })
      techSearchResults.value = (res.data ?? []).map(t => t.name)
    } catch {
      techSearchResults.value = []
    }
  }, 300)
}

async function submitConfirmLink() {
  if (!confirmItem.value || !selectedTech.value) return
  confirmLoading.value = true
  confirmError.value = ''
  try {
    await $fetch(`/api/technologies/${encodeURIComponent(selectedTech.value)}/components`, {
      method: 'POST',
      body: { purl: confirmItem.value.name }
    })
    confirmModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to link component'
    confirmError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    confirmLoading.value = false
  }
}

async function submitCreateNew() {
  if (!confirmItem.value) return
  const name = techSearch.value.trim()
  if (!name || !createForm.type) return

  confirmLoading.value = true
  confirmError.value = ''
  try {
    await $fetch('/api/technologies', {
      method: 'POST',
      body: {
        name,
        type: createForm.type,
        domain: createForm.domain || undefined,
        vendor: createForm.vendor || undefined,
        ownerTeam: createForm.ownerTeam || undefined,
        componentName: confirmItem.value.name
      }
    })
    confirmModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create technology'
    confirmError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    confirmLoading.value = false
  }
}

// Dismiss
const dismissError = ref('')

async function dismissItem(item: LinkSuggestion) {
  dismissError.value = ''
  try {
    await $fetch('/api/components/dismiss-link', {
      method: 'POST',
      body: { componentName: item.name }
    })
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    dismissError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  }
}

useHead({ title: 'Component Link Queue - Polaris' })
</script>
