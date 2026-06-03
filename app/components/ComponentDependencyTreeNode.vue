<template>
  <li class="relative" :data-node-key="nodeKey">
    <UCollapsible :open="isExpanded" :unmount-on-hide="false">
      <button
        type="button"
        class="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-(--ui-bg-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ui-primary)"
        :aria-expanded="hasChildren ? String(isExpanded) : undefined"
        :aria-label="`${isExpanded ? 'Collapse' : 'Expand'} ${displayName}`"
        :disabled="!hasChildren && !canLoadChildren"
        @click="emit('toggle', node, parentKey)"
      >
        <UIcon
          :name="hasChildren || canLoadChildren ? 'i-lucide-chevron-right' : 'i-lucide-minus'"
          class="mt-0.5 size-4 flex-shrink-0 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium break-all" :class="{ 'text-(--ui-text-muted)': !node.isDirect }">
              {{ displayName }}
            </span>
            <UBadge v-if="node.scope" :color="scopeColor(node.scope)" variant="subtle" size="xs">
              {{ node.scope }}
            </UBadge>
            <UBadge :color="node.isDirect ? 'primary' : 'neutral'" variant="subtle" size="xs">
              {{ node.isDirect ? 'direct' : 'transitive' }}
            </UBadge>
            <UBadge v-if="node.isCircular" color="warning" variant="subtle" size="xs">
              circular
            </UBadge>
          </div>
          <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--ui-text-muted)">
            <span v-if="node.version">v{{ node.version }}</span>
            <span v-if="node.packageManager">{{ node.packageManager }}</span>
            <span>depth {{ node.depth }}</span>
          </div>
          <code v-if="node.purl" class="mt-1 block truncate text-xs text-(--ui-text-muted)">
            {{ node.purl }}
          </code>
        </div>
        <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="mt-0.5 size-4 animate-spin text-(--ui-text-muted)" />
      </button>

      <template #content>
        <ul
          v-if="isExpanded && hasChildren"
          class="ml-4 border-l border-(--ui-border) pl-3"
          role="group"
        >
          <ComponentDependencyTreeNode
            v-for="child in node.children"
            :key="dependencyNodeKey(child)"
            :node="child"
            :parent-key="nodeKey"
            :expanded-child-by-parent="expandedChildByParent"
            :loading-keys="loadingKeys"
            :loaded-keys="loadedKeys"
            @toggle="(childNode, childParentKey) => emit('toggle', childNode, childParentKey)"
          />
        </ul>
      </template>
    </UCollapsible>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DependencyNode, DependencyScope } from '~~/types/api'
import { dependencyNodeKey } from '~~/utils/dependency-node-key'

const props = defineProps<{
  node: DependencyNode
  parentKey: string
  expandedChildByParent: Record<string, string | undefined>
  loadingKeys: string[]
  loadedKeys: string[]
}>()

const emit = defineEmits<{
  toggle: [node: DependencyNode, parentKey: string]
}>()

defineOptions({
  name: 'ComponentDependencyTreeNode'
})

const nodeKey = computed(() => dependencyNodeKey(props.node))
const isExpanded = computed(() => props.expandedChildByParent[props.parentKey] === nodeKey.value)
const isLoading = computed(() => props.loadingKeys.includes(nodeKey.value))
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const canLoadChildren = computed(() =>
  !props.node.isCircular && !props.loadedKeys.includes(nodeKey.value)
)
const displayName = computed(() =>
  props.node.group ? `${props.node.group}/${props.node.name}` : props.node.name
)

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
