<template>
  <div class="space-y-6">
    <UPageHeader
      title="Component Link Queue"
      :description="`${total} component${total === 1 ? '' : 's'} awaiting a Technology link`"
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

    <!-- Confirm link modal -->
    <UModal v-model:open="confirmModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Link to Technology</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="text-sm text-(--ui-text-muted)">
            Component: <code>{{ confirmItem?.purl }}</code>
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
              @click="selectedTech = name; techSearch = name; techSearchResults = []"
            >
              {{ name }}
            </UButton>
          </div>

          <div v-if="selectedTech" class="text-sm">
            Selected technology: <strong>{{ selectedTech }}</strong>
          </div>

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
          :loading="confirmLoading"
          :label="confirmLoading ? 'Linking…' : 'Confirm Link'"
          :disabled="!selectedTech"
          @click="submitConfirmLink"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface LinkSuggestion {
  purl: string
  name: string
  version: string
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

const columns: TableColumn<LinkSuggestion>[] = [
  {
    accessorKey: 'name',
    header: 'Component',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'space-y-0.5' }, [
        h('div', { class: 'font-medium' }, item.name),
        h('code', { class: 'text-xs text-(--ui-text-muted)' }, item.version)
      ])
    }
  },
  {
    accessorKey: 'packageManager',
    header: 'Ecosystem',
    cell: ({ row }) => row.getValue('packageManager') ?? '—'
  },
  {
    accessorKey: 'purl',
    header: 'PURL',
    cell: ({ row }) => h('code', { class: 'text-xs break-all' }, row.getValue('purl') as string)
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

// Confirm modal
const confirmModalOpen = ref(false)
const confirmItem = ref<LinkSuggestion | null>(null)
const selectedTech = ref('')
const techSearch = ref('')
const techSearchResults = ref<string[]>([])
const confirmLoading = ref(false)
const confirmError = ref('')

let techSearchTimer: ReturnType<typeof setTimeout> | null = null

function openConfirmModal(item: LinkSuggestion) {
  confirmItem.value = item
  selectedTech.value = item.suggestedTechnologies[0] ?? ''
  techSearch.value = selectedTech.value
  techSearchResults.value = []
  confirmError.value = ''
  confirmModalOpen.value = true
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
      body: { purl: confirmItem.value.purl }
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

// Dismiss
const dismissError = ref('')

async function dismissItem(item: LinkSuggestion) {
  dismissError.value = ''
  try {
    await $fetch('/api/components/dismiss-link', {
      method: 'POST',
      body: { purl: item.purl }
    })
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    dismissError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  }
}

useHead({ title: 'Component Link Queue - Polaris' })
</script>
