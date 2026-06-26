<template>
  <div class="space-y-4">
    <DependencyFilters v-if="systemName" v-model="selectedScopes" />

    <USkeleton v-if="pending" class="h-32 w-full" />

    <UAlert
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Unable to load dependencies"
      :description="errorMessage"
    />

    <template v-else>
      <UAlert
        v-if="treeMeta?.truncated"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Dependency tree truncated"
        description="Only the first 500 dependency nodes are shown."
      />

      <UAlert
        v-if="treeMeta?.hasCircularDependencies"
        color="warning"
        variant="subtle"
        icon="i-lucide-refresh-cw"
        title="Circular dependencies detected"
        description="Circular branches are marked and are not expanded further."
      />

      <div v-if="treeItems.length === 0" class="rounded-md border border-dashed border-(--ui-border) p-6 text-center">
        <UIcon name="i-lucide-package-open" class="mx-auto mb-2 size-8 text-(--ui-text-muted)" />
        <p class="font-medium">{{ selectedScopes.length > 0 ? 'No dependencies match the selected filters.' : 'This component has no dependencies.' }}</p>
      </div>

      <UTree
        v-else
        v-model:expanded="expandedKeys"
        :items="treeItems"
        :get-key="item => item.key"
        :virtualize="virtualizeConfig"
        aria-label="Component dependencies"
        :ui="{
          root: 'space-y-1',
          item: 'w-full',
          itemWithChildren: 'ps-1.5 -ms-px',
          listWithChildren: 'ml-4 border-l border-(--ui-border) pl-3'
        }"
      >
        <template #item-wrapper="{ item, expanded, handleToggle }">
          <div
            v-if="item.placeholder"
            class="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-(--ui-text-muted)"
          >
            <UIcon
              :name="item.loading ? 'i-lucide-loader-circle' : 'i-lucide-minus'"
              class="size-4 flex-shrink-0"
              :class="{ 'animate-spin': item.loading }"
            />
            <span>{{ item.label }}</span>
          </div>

          <UButton
            v-else
            variant="ghost"
            color="neutral"
            :data-node-key="item.key"
            :aria-expanded="item.children?.length ? String(expanded) : undefined"
            :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${item.displayName}`"
            :disabled="item.loading"
            class="w-full justify-start px-2 py-2"
            @click="toggleTreeItem(item, expanded, handleToggle)"
          >
            <UIcon
              :name="item.children?.length ? 'i-lucide-chevron-right' : 'i-lucide-minus'"
              class="mt-0.5 size-4 flex-shrink-0 transition-transform"
              :class="{ 'rotate-90': expanded }"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium break-all" :class="{ 'text-(--ui-text-muted)': !item.node.isDirect }">
                  {{ item.displayName }}
                </span>
                <UBadge v-if="item.node.scope" :color="scopeColor(item.node.scope)" variant="subtle" size="xs">
                  {{ item.node.scope }}
                </UBadge>
                <UBadge :color="item.node.isDirect ? 'primary' : 'neutral'" variant="subtle" size="xs">
                  {{ item.node.isDirect ? 'direct' : 'transitive' }}
                </UBadge>
                <UBadge v-if="item.node.isCircular" color="warning" variant="subtle" size="xs">
                  circular
                </UBadge>
              </div>
              <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--ui-text-muted)">
                <span v-if="item.node.version">v{{ item.node.version }}</span>
                <span v-if="item.node.packageManager">{{ item.node.packageManager }}</span>
                <span>depth {{ item.node.depth }}</span>
              </div>
              <code v-if="item.node.purl" class="mt-1 block truncate text-xs text-(--ui-text-muted)">
                {{ item.node.purl }}
              </code>
            </div>
            <UIcon
              v-if="item.loading"
              name="i-lucide-loader-circle"
              class="mt-0.5 size-4 animate-spin text-(--ui-text-muted)"
            />
          </UButton>
        </template>
      </UTree>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { encodeComponentKey } from '~~/utils/component-identity'
import { dependencyNodeKey } from '~~/utils/dependency-node-key'
import type { Component, DependencyNode, DependencyScope, DependencyTreeResponse } from '~~/types/api'
import DependencyFilters from './DependencyFilters.vue'

const toast = useToast()

interface DependencyTreeApiResponse {
  success: boolean
  data: DependencyTreeResponse
}

interface DependencyTreeItem {
  key: string
  label: string
  displayName: string
  node: DependencyNode
  loading?: boolean
  placeholder?: false
  children?: DependencyTreeItem[]
}

interface DependencyPlaceholderItem {
  key: string
  label: string
  displayName: string
  node?: never
  loading: boolean
  placeholder: true
  disabled: true
}

type DependencyItem = DependencyTreeItem | DependencyPlaceholderItem

const props = defineProps<{
  componentKey: string
  systemName?: string
  initialFilters?: DependencyScope[]
}>()

const selectedScopes = ref<DependencyScope[]>(props.initialFilters ? [...props.initialFilters] : [])
const treeItems = ref<DependencyItem[]>([])
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const treeMeta = ref<Pick<DependencyTreeResponse, 'truncated' | 'hasCircularDependencies' | 'totalCount'> | null>(null)
const expandedKeys = ref<string[]>([])
const loadedNodeKeys = ref(new Set<string>())
const loadingNodeKeys = ref(new Set<string>())
const dependencyCache = new Map<string, DependencyNode[]>()

const filterSignature = computed(() => selectedScopes.value.toSorted().join(','))
const virtualizeConfig = computed(() => {
  const totalCount = treeMeta.value?.totalCount ?? 0
  return totalCount > 100
    ? { estimateSize: 72, overscan: 12 }
    : false
})
let loadRootRequestId = 0

watch(
  () => [props.componentKey, props.systemName ?? '', filterSignature.value],
  async ([, systemName]) => {
    if (!systemName && selectedScopes.value.length > 0) {
      selectedScopes.value = []
      return
    }

    await loadRoot()
  },
  { immediate: true }
)

async function loadRoot() {
  const requestId = ++loadRootRequestId

  pending.value = true
  errorMessage.value = null
  treeItems.value = []
  treeMeta.value = null
  expandedKeys.value = []
  loadedNodeKeys.value = new Set()
  loadingNodeKeys.value = new Set()
  dependencyCache.clear()

  try {
    const response = await fetchDependencies(props.componentKey)
    if (requestId !== loadRootRequestId) return

    treeItems.value = response.dependencies.map(toTreeItem)
    treeMeta.value = {
      truncated: response.truncated,
      hasCircularDependencies: response.hasCircularDependencies,
      totalCount: response.totalCount
    }
  } catch (error) {
    if (requestId !== loadRootRequestId) return
    errorMessage.value = error instanceof Error ? error.message : 'Dependency tree could not be loaded.'
  } finally {
    if (requestId === loadRootRequestId) pending.value = false
  }
}

async function toggleTreeItem(
  item: DependencyTreeItem,
  expanded: boolean,
  handleToggle: () => void
) {
  if (item.loading) return

  handleToggle()

  if (expanded || item.node.isCircular || loadedNodeKeys.value.has(item.key)) {
    return
  }

  const cachedChildren = dependencyCache.get(cacheKey(item.key))
  if (cachedChildren) {
    item.children = cachedChildren.map(toTreeItem)
    markLoaded(item.key)
    refreshTreeItems()
    return
  }

  setItemLoading(item, true)
  try {
    const response = await fetchDependencies(componentKeyForNode(item.node))
    const children = response.dependencies.map(child => ({
      ...child,
      depth: item.node.depth + child.depth,
      isDirect: false
    }))
    dependencyCache.set(cacheKey(item.key), children)
    item.children = children.map(toTreeItem)
    treeMeta.value = {
      truncated: Boolean(treeMeta.value?.truncated || response.truncated),
      hasCircularDependencies: Boolean(treeMeta.value?.hasCircularDependencies || response.hasCircularDependencies),
      totalCount: treeMeta.value?.totalCount ?? response.totalCount
    }
    markLoaded(item.key)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dependency children'
    toast.add({ title: 'Failed to load dependencies', description: message, color: 'error' })
  } finally {
    clearItemLoading(item)
  }
}

async function fetchDependencies(componentKey: string): Promise<DependencyTreeResponse> {
  const query = new URLSearchParams({
    maxDepth: '1',
    limit: '500'
  })

  if (props.systemName) query.set('system', props.systemName)
  if (selectedScopes.value.length > 0) query.set('scope', selectedScopes.value.join(','))

  const response = await $fetch<DependencyTreeApiResponse>(
    `/api/components/${encodeURIComponent(componentKey)}/dependencies?${query.toString()}`
  )
  return response.data
}

function componentKeyForNode(node: DependencyNode): string {
  return encodeComponentKey({
    purl: node.purl,
    packageManager: node.packageManager,
    group: node.group,
    name: node.name,
    version: node.version
  } as Pick<Component, 'purl' | 'packageManager' | 'group' | 'name' | 'version'>)
}

function cacheKey(nodeKey: string): string {
  return [
    nodeKey,
    props.systemName ?? '',
    filterSignature.value,
    'maxDepth=1',
    'limit=500'
  ].join('|')
}

function toTreeItem(node: DependencyNode): DependencyTreeItem {
  const nodeKey = dependencyNodeKey(node)
  const children = node.children?.length
    ? node.children.map(toTreeItem)
    : shouldAllowExpansion(node, nodeKey)
      ? [loadingPlaceholder(nodeKey, false)]
      : undefined

  return {
    key: nodeKey,
    label: displayName(node),
    displayName: displayName(node),
    node,
    children
  }
}

function shouldAllowExpansion(node: DependencyNode, nodeKey: string): boolean {
  return !node.isCircular && !loadedNodeKeys.value.has(nodeKey)
}

function loadingPlaceholder(parentKey: string, loading: boolean): DependencyPlaceholderItem {
  return {
    key: `${parentKey}:placeholder`,
    label: loading ? 'Loading dependencies…' : 'Expand to load dependencies',
    displayName: loading ? 'Loading dependencies…' : 'Expand to load dependencies',
    loading,
    placeholder: true,
    disabled: true
  }
}

function displayName(node: DependencyNode): string {
  return node.group ? `${node.group}/${node.name}` : node.name
}

function setItemLoading(item: DependencyTreeItem, loading: boolean) {
  item.loading = loading
  item.children = [loadingPlaceholder(item.key, loading)]
  markLoading(item.key, loading)
  refreshTreeItems()
}

function clearItemLoading(item: DependencyTreeItem) {
  item.loading = false
  markLoading(item.key, false)
  refreshTreeItems()
}

function refreshTreeItems() {
  treeItems.value = [...treeItems.value]
}

function markLoaded(nodeKey: string) {
  const next = new Set(loadedNodeKeys.value)
  next.add(nodeKey)
  loadedNodeKeys.value = next
}

function markLoading(nodeKey: string, loading: boolean) {
  const next = new Set(loadingNodeKeys.value)
  if (loading) next.add(nodeKey)
  else next.delete(nodeKey)
  loadingNodeKeys.value = next
}

function scopeColor(scope: DependencyScope): 'primary' | 'info' | 'warning' | 'neutral' | 'error' {
  const colors: Record<DependencyScope, 'primary' | 'info' | 'warning' | 'neutral' | 'error'> = {
    runtime: 'primary',
    required: 'primary',
    dev: 'warning',
    test: 'info',
    optional: 'neutral',
    provided: 'neutral',
    excluded: 'error'
  }
  return colors[scope]
}
</script>
