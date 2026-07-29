<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Link Component to {{ techName }}</h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Search Components</label>
          <UInput
            v-model="search"
            placeholder="Type at least 2 characters to search..."
            icon="i-lucide-search"
          />
        </div>
        <div v-if="searching" class="text-sm text-(--ui-text-muted)">
          Searching...
        </div>
        <div v-else-if="search.length >= 2 && searchResults.length === 0" class="text-sm text-(--ui-text-muted)">
          No components found.
        </div>
        <div v-if="searchResults.length > 0" class="max-h-60 overflow-y-auto border border-(--ui-border) rounded-md divide-y divide-(--ui-border)">
          <UButton
            v-for="comp in searchResults"
            :key="`${comp.packageManager}:${comp.group}:${comp.name}@${comp.version}`"
            variant="ghost"
            color="neutral"
            class="w-full justify-start px-3 py-2"
            :class="{ 'bg-(--ui-bg-elevated)': isSelected(comp) }"
            @click="selected = { name: comp.name, version: comp.version, group: comp.group ?? null, packageManager: comp.packageManager ?? null }"
          >
            <span class="font-medium">{{ displayName(comp) }}</span>
            <code class="ml-2 text-sm">{{ comp.version }}</code>
          </UButton>
        </div>
        <div v-if="selected" class="text-sm">
          Selected: <strong>{{ displayName(selected) }}</strong> <code>{{ selected.version }}</code>
        </div>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="error"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="emit('update:open', false)" />
        <UButton
          :loading="loading"
          :label="loading ? 'Linking...' : 'Link Component'"
          :disabled="!selected"
          @click="confirmLink"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  techName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  linked: []
}>()

interface ComponentOption {
  name: string
  version: string
  group?: string | null
  packageManager?: string | null
  purl?: string
}

const loading = ref(false)
const error = ref('')
const search = ref('')
const searchResults = ref<ComponentOption[]>([])
const searching = ref(false)
const selected = ref<ComponentOption | null>(null)

// Group-qualifies the display name — different scopes/ecosystems can share a bare
// name (e.g. @nuxt/ui vs @vitest/ui), so the bare name alone can be ambiguous.
function displayName(comp: ComponentOption): string {
  return comp.group ? `${comp.group}/${comp.name}` : comp.name
}

function isSelected(comp: ComponentOption): boolean {
  return selected.value?.name === comp.name &&
    selected.value?.version === comp.version &&
    (selected.value?.group ?? null) === (comp.group ?? null) &&
    (selected.value?.packageManager ?? null) === (comp.packageManager ?? null)
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  selected.value = null
  if (!val || val.length < 2) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const res = await $fetch<{ data: { name: string; version: string; group?: string | null; packageManager?: string | null; purl?: string; technologyName?: string }[] }>('/api/components', {
        query: { search: val, limit: 20 }
      })
      // Only show components not already linked to a technology
      searchResults.value = (res.data || []).filter(c => !c.technologyName)
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

async function confirmLink() {
  if (!selected.value) return
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.techName)}/components`, {
      method: 'POST',
      body: {
        componentName: selected.value.name,
        componentVersion: selected.value.version,
        componentGroup: selected.value.group ?? null,
        componentPackageManager: selected.value.packageManager ?? null
      }
    })
    emit('update:open', false)
    emit('linked')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e.data?.message || e.message || 'Failed to link component'
  } finally {
    loading.value = false
  }
}
</script>
