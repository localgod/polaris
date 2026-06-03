<template>
  <div class="space-y-4">
    <DependencyFilters v-if="systemName" v-model="selectedScopes" />
    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="Global dependency view"
      description="Scope filters require a system context because dependency scope is system-specific."
    />

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

      <div v-if="dependencies.length === 0" class="rounded-md border border-dashed border-(--ui-border) p-6 text-center">
        <UIcon name="i-lucide-package-open" class="mx-auto mb-2 size-8 text-(--ui-text-muted)" />
        <p class="font-medium">{{ selectedScopes.length > 0 ? 'No dependencies match the selected filters.' : 'No dependencies found.' }}</p>
      </div>

      <ul v-else class="space-y-1" role="tree" aria-label="Component dependencies">
        <ComponentDependencyTreeNode
          v-for="node in dependencies"
          :key="dependencyNodeKey(node)"
          :node="node"
          parent-key="root"
          :expanded-child-by-parent="expandedChildByParent"
          :loading-keys="loadingKeys"
          :loaded-keys="loadedKeys"
          @toggle="toggleNode"
        />
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { encodeComponentKey } from '~~/utils/component-identity'
import { dependencyNodeKey } from '~~/utils/dependency-node-key'
import type { Component, DependencyNode, DependencyScope, DependencyTreeResponse } from '~~/types/api'
import DependencyFilters from './DependencyFilters.vue'
import ComponentDependencyTreeNode from './ComponentDependencyTreeNode.vue'

interface DependencyTreeApiResponse {
  success: boolean
  data: DependencyTreeResponse
}

const props = defineProps<{
  componentKey: string
  systemName?: string
  initialFilters?: DependencyScope[]
}>()

const selectedScopes = ref<DependencyScope[]>(props.initialFilters ? [...props.initialFilters] : [])
const dependencies = ref<DependencyNode[]>([])
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const treeMeta = ref<Pick<DependencyTreeResponse, 'truncated' | 'hasCircularDependencies' | 'totalCount'> | null>(null)
const expandedChildByParent = ref<Record<string, string | undefined>>({})
const loadedNodeKeys = ref(new Set<string>())
const loadingNodeKeys = ref(new Set<string>())
const dependencyCache = new Map<string, DependencyNode[]>()

const loadedKeys = computed(() => [...loadedNodeKeys.value])
const loadingKeys = computed(() => [...loadingNodeKeys.value])
const filterSignature = computed(() => selectedScopes.value.toSorted().join(','))

watch(
  () => [props.componentKey, props.systemName ?? '', filterSignature.value],
  async () => {
    await loadRoot()
  },
  { immediate: true }
)

async function loadRoot() {
  pending.value = true
  errorMessage.value = null
  dependencies.value = []
  treeMeta.value = null
  expandedChildByParent.value = {}
  loadedNodeKeys.value = new Set()
  loadingNodeKeys.value = new Set()
  dependencyCache.clear()

  try {
    const response = await fetchDependencies(props.componentKey)
    dependencies.value = response.dependencies
    treeMeta.value = {
      truncated: response.truncated,
      hasCircularDependencies: response.hasCircularDependencies,
      totalCount: response.totalCount
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Dependency tree could not be loaded.'
  } finally {
    pending.value = false
  }
}

async function toggleNode(node: DependencyNode, parentKey: string) {
  const nodeKey = dependencyNodeKey(node)
  if (expandedChildByParent.value[parentKey] === nodeKey) {
    expandedChildByParent.value = {
      ...expandedChildByParent.value,
      [parentKey]: undefined
    }
    return
  }

  expandedChildByParent.value = {
    ...expandedChildByParent.value,
    [parentKey]: nodeKey
  }

  if (node.isCircular || loadedNodeKeys.value.has(nodeKey)) return

  const cachedChildren = dependencyCache.get(cacheKey(nodeKey))
  if (cachedChildren) {
    node.children = cachedChildren
    markLoaded(nodeKey)
    return
  }

  markLoading(nodeKey, true)
  try {
    const response = await fetchDependencies(componentKeyForNode(node))
    node.children = response.dependencies.map(child => ({
      ...child,
      depth: node.depth + child.depth,
      isDirect: false
    }))
    dependencyCache.set(cacheKey(nodeKey), node.children)
    treeMeta.value = {
      truncated: Boolean(treeMeta.value?.truncated || response.truncated),
      hasCircularDependencies: Boolean(treeMeta.value?.hasCircularDependencies || response.hasCircularDependencies),
      totalCount: treeMeta.value?.totalCount ?? response.totalCount
    }
    markLoaded(nodeKey)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Dependency children could not be loaded.'
  } finally {
    markLoading(nodeKey, false)
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
</script>
