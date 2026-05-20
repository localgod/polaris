<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <div v-if="!hasNodes" class="text-center py-12 text-(--ui-text-muted)">
      <UIcon name="i-lucide-share-2" class="text-4xl mb-3" />
      <p>No components found for this system.</p>
    </div>

    <template v-else>
      <!-- Legend -->
      <div class="flex flex-wrap gap-3 text-sm">
        <div v-for="pm in packageManagers" :key="pm" class="flex items-center gap-1.5">
          <UIcon
            :name="pmIcon(pm)"
            class="flex-shrink-0 size-4"
            :style="{ color: pmColor(pm) }"
          />
          <span class="text-(--ui-text-muted)">{{ pm }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0" style="background:var(--ui-primary);opacity:0.5" />
          <span class="text-(--ui-text-muted)">technology</span>
        </div>
      </div>

      <!-- SVG canvas -->
      <div
        ref="containerRef"
        class="relative border border-(--ui-border) rounded-lg bg-(--ui-bg-elevated)"
        style="height:520px;overflow:hidden;"
        @dblclick="resetZoom"
      >
        <svg ref="svgRef" style="width:100%;height:100%;" />

        <div
          v-if="tooltip.visible"
          class="absolute pointer-events-none z-10 px-2 py-1 rounded text-xs bg-(--ui-bg) border border-(--ui-border) shadow-sm text-(--ui-text) max-w-48"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >{{ tooltip.text }}</div>

        <p class="absolute bottom-2 right-3 text-xs text-(--ui-text-muted) pointer-events-none select-none">
          Scroll to zoom · Drag to pan · Double-click to reset
        </p>
      </div>

      <!-- Component detail panel -->
      <UCard v-if="selectedNode && selectedNode.type === 'component'">
        <template #header>
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-base">{{ selectedNode.label }}</h3>
              <p v-if="selectedNode.version" class="text-sm text-(--ui-text-muted)">v{{ selectedNode.version }}</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" size="xs" color="neutral" @click="selectedNode = null" />
          </div>
        </template>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div v-if="selectedNode.packageManager">
            <span class="text-(--ui-text-muted) block">Package Manager</span>
            <span class="font-medium flex items-center gap-1">
              <UIcon
                :name="pmIcon(selectedNode.packageManager)"
                class="size-4 flex-shrink-0"
                :style="{ color: pmColor(selectedNode.packageManager) }"
              />
              {{ selectedNode.packageManager }}
            </span>
          </div>
          <div v-if="selectedNode.componentType">
            <span class="text-(--ui-text-muted) block">Type</span>
            <span class="font-medium">{{ selectedNode.componentType }}</span>
          </div>
          <div v-if="selectedNode.scope">
            <span class="text-(--ui-text-muted) block">Scope</span>
            <span class="font-medium">{{ selectedNode.scope }}</span>
          </div>
          <div v-if="selectedNode.technologyName">
            <span class="text-(--ui-text-muted) block">Technology</span>
            <NuxtLink
              :to="`/technologies/${encodeURIComponent(selectedNode.technologyName)}`"
              class="font-medium hover:underline text-(--ui-primary)"
            >{{ selectedNode.technologyName }}</NuxtLink>
          </div>
          <div v-if="selectedNode.purl" class="col-span-2 sm:col-span-3">
            <span class="text-(--ui-text-muted) block">PURL</span>
            <code class="text-xs break-all">{{ selectedNode.purl }}</code>
          </div>
          <div v-if="selectedNode.cpe" class="col-span-2 sm:col-span-3">
            <span class="text-(--ui-text-muted) block">CPE</span>
            <code class="text-xs break-all">{{ selectedNode.cpe }}</code>
          </div>
          <div v-if="selectedNode.description" class="col-span-2 sm:col-span-3">
            <span class="text-(--ui-text-muted) block">Description</span>
            <span>{{ selectedNode.description }}</span>
          </div>
        </div>
        <div v-if="selectedNode.licenses && selectedNode.licenses.length > 0" class="mt-4">
          <span class="text-(--ui-text-muted) text-sm block mb-1">Licenses</span>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="lic in selectedNode.licenses"
              :key="lic.id ?? lic.name"
              :color="lic.allowed === false ? 'error' : 'success'"
              variant="subtle"
              size="sm"
            >{{ lic.id ?? lic.name }}</UBadge>
          </div>
        </div>
        <template #footer>
          <UButton
            :to="`/components?search=${encodeURIComponent(selectedNode.label)}`"
            variant="outline"
            size="sm"
            icon="i-lucide-external-link"
            label="View in component list"
          />
        </template>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'

// ── Props ──────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string
  label: string
  type: 'system' | 'group' | 'component' | 'technology'
  packageManager?: string | null
  count?: number
  version?: string | null
  componentType?: string | null
  scope?: string | null
  purl?: string | null
  cpe?: string | null
  group?: string | null
  description?: string | null
  licenses?: Array<{ id?: string; name?: string; allowed?: boolean }>
  technologyName?: string | null
  direct?: boolean
  dependsOn?: string[]
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
}

const props = defineProps<{
  systemName: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}>()

// ── Template refs ──────────────────────────────────────────────────────────

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// ── Derived data ───────────────────────────────────────────────────────────

const hasNodes = computed(() => props.nodes.length > 0)

// ── Colors & icons ─────────────────────────────────────────────────────────

const PM_COLORS: Record<string, string> = {
  npm: '#cb3837', yarn: '#2c8ebb', maven: '#c71a36', gradle: '#02303a',
  pypi: '#3572a5', cargo: '#dea584', nuget: '#004880', gem: '#cc342d',
  go: '#00add8', composer: '#885630', unknown: '#6b7280',
}

const PM_ICONS: Record<string, string> = {
  npm:      'i-simple-icons-npm',
  yarn:     'i-simple-icons-yarn',
  maven:    'i-simple-icons-apachemaven',
  gradle:   'i-simple-icons-gradle',
  pypi:     'i-simple-icons-pypi',
  cargo:    'i-simple-icons-rust',
  nuget:    'i-simple-icons-nuget',
  gem:      'i-simple-icons-rubygems',
  go:       'i-simple-icons-go',
  composer: 'i-simple-icons-composer',
}

function pmColor(pm: string | null | undefined): string {
  return PM_COLORS[(pm ?? 'unknown').toLowerCase()] ?? PM_COLORS.unknown
}

function pmIcon(pm: string | null | undefined): string {
  return PM_ICONS[(pm ?? 'unknown').toLowerCase()] ?? 'i-lucide-package'
}

const packageManagers = computed(() =>
  [...new Set(props.nodes.filter(n => n.type === 'group').map(n => n.packageManager ?? 'unknown'))]
)

// ── Expand / collapse ──────────────────────────────────────────────────────

const expandedGroups = ref(new Set<string>())
const expandedComponents = ref(new Set<string>())

// Whether any component in the graph has direct=true (i.e. DEPENDS_ON data exists)
const hasDependencyData = computed(() =>
  props.nodes.some(n => n.type === 'component' && n.direct === true)
)

// Fallback cap when no DEPENDS_ON data exists
const GROUP_DISPLAY_LIMIT = 50

// Stable id→node map; only rebuilt when props.nodes changes (not on every toggle)
const nodeById = computed(() => new Map(props.nodes.map(n => [n.id, n])))

// Pre-computed direct-dep count per package manager for tooltip use
const directCountByPm = computed(() => {
  const map = new Map<string, number>()
  for (const n of props.nodes) {
    if (n.type === 'component' && n.direct) {
      const pm = n.packageManager ?? 'unknown'
      map.set(pm, (map.get(pm) ?? 0) + 1)
    }
  }
  return map
})

function toggleGroup(groupId: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(groupId)) {
    next.delete(groupId)
    // Collapse all component expansions belonging to this group
    const pm = groupId.replace(/^group:/, '')
    const compNext = new Set(expandedComponents.value)
    for (const id of compNext) {
      const node = nodeById.value.get(id)
      if (node && (node.packageManager ?? 'unknown') === pm) compNext.delete(id)
    }
    expandedComponents.value = compNext
    selectedNode.value = null
  } else {
    next.add(groupId)
  }
  expandedGroups.value = next
}

function toggleComponent(compId: string) {
  const next = new Set(expandedComponents.value)
  if (next.has(compId)) {
    // Collapse this component and all its descendants
    collapseDescendants(compId, next)
    next.delete(compId)
  } else {
    next.add(compId)
  }
  expandedComponents.value = next
}

function collapseDescendants(compId: string, set: Set<string>) {
  const node = nodeById.value.get(compId)
  if (!node?.dependsOn) return
  for (const childId of node.dependsOn) {
    if (set.has(childId)) {
      collapseDescendants(childId, set)
      set.delete(childId)
    }
  }
}

// ── Visible nodes / edges ──────────────────────────────────────────────────

const visibleNodes = computed<GraphNode[]>(() => {
  const expanded = expandedGroups.value
  const expandedComps = expandedComponents.value
  const byId = nodeById.value

  // Collect visible component IDs
  const visibleCompIds = new Set<string>()

  for (const groupId of expanded) {
    const pm = groupId.replace(/^group:/, '')
    const groupComps = props.nodes.filter(
      n => n.type === 'component' && (n.packageManager ?? 'unknown') === pm
    )

    if (hasDependencyData.value) {
      // Show only direct deps of the system for this group
      groupComps.filter(n => n.direct).forEach(n => visibleCompIds.add(n.id))
    } else {
      // Fallback: no DEPENDS_ON data — show first N alphabetically
      groupComps
        .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''))
        .slice(0, GROUP_DISPLAY_LIMIT)
        .forEach(n => visibleCompIds.add(n.id))
    }
  }

  // For each expanded component, add its direct dependencies (cycle-safe)
  const visited = new Set<string>()
  function addDependencies(compId: string) {
    if (visited.has(compId)) return
    visited.add(compId)
    if (!expandedComps.has(compId)) return
    const node = byId.get(compId)
    if (!node?.dependsOn) return
    for (const depId of node.dependsOn) {
      visibleCompIds.add(depId)
      addDependencies(depId)
    }
  }
  for (const compId of expandedComps) {
    addDependencies(compId)
  }

  // Pre-build the set of visible tech names to avoid O(n²) scan in the filter
  const visibleTechNames = new Set<string>()
  for (const id of visibleCompIds) {
    const techName = byId.get(id)?.technologyName
    if (techName) visibleTechNames.add(techName)
  }

  return props.nodes.filter(n => {
    if (n.type === 'system' || n.type === 'group') return true
    if (n.type === 'component') return visibleCompIds.has(n.id)
    if (n.type === 'technology') return visibleTechNames.has(n.label)
    return false
  })
})

const visibleNodeIds = computed(() => new Set(visibleNodes.value.map(n => n.id)))

const visibleEdges = computed<GraphEdge[]>(() =>
  props.edges.filter(e => {
    const src = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id
    const tgt = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id
    return visibleNodeIds.value.has(src) && visibleNodeIds.value.has(tgt)
  })
)

// ── D3 state ───────────────────────────────────────────────────────────────

const positionCache = new Map<string, { x: number; y: number }>()
let simulation: d3.Simulation<GraphNode, undefined> | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let gRoot: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gLink: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gNode: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })
const selectedNode = ref<GraphNode | null>(null)

// ── Helpers ────────────────────────────────────────────────────────────────

function nodeRadius(n: GraphNode): number {
  if (n.type === 'system') return 22
  if (n.type === 'group') return 18
  if (n.type === 'technology') return 12
  // Transitive deps (when dependency data exists) are smaller
  if (n.type === 'component' && hasDependencyData.value && !n.direct) return 5
  return 7
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── SVG init ───────────────────────────────────────────────────────────────

function initSvg(): boolean {
  const svgEl = svgRef.value
  if (!svgEl) return false

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()

  gRoot = svg.append('g').attr('class', 'root')
  gLink = gRoot.append('g').attr('class', 'links')
  gNode = gRoot.append('g').attr('class', 'nodes')

  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 4])
    .on('zoom', event => gRoot!.attr('transform', event.transform))

  svg.call(zoomBehavior)
  return true
}

// ── Graph update ───────────────────────────────────────────────────────────

function updateGraph() {
  if (!gLink || !gNode) return
  if (visibleNodes.value.length === 0) return

  const containerEl = containerRef.value
  const width = containerEl?.clientWidth || 800
  const height = containerEl?.clientHeight || 520

  const simNodes: GraphNode[] = visibleNodes.value.map(n => {
    const cached = positionCache.get(n.id)
    return {
      ...n,
      x: cached?.x ?? width / 2 + (Math.random() - 0.5) * 80,
      y: cached?.y ?? height / 2 + (Math.random() - 0.5) * 80,
    }
  })

  const nodeById = new Map(simNodes.map(n => [n.id, n]))
  const simEdges = visibleEdges.value
    .map(e => {
      const src = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id
      const tgt = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id
      return { source: nodeById.get(src)!, target: nodeById.get(tgt)! }
    })
    .filter(e => e.source && e.target)

  if (simulation) simulation.stop()

  const drag = d3.drag<SVGGElement, GraphNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation?.alphaTarget(0.3).restart()
      d.fx = d.x; d.fy = d.y
    })
    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
    .on('end', (event, d) => {
      if (!event.active) simulation?.alphaTarget(0)
      d.fx = null; d.fy = null
    })

  const linkSel = gLink!
    .selectAll<SVGLineElement, { source: GraphNode; target: GraphNode }>('line')
    .data(simEdges, d => `${d.source.id}→${d.target.id}`)
  linkSel.exit().remove()
  const links = linkSel.enter().append('line')
    .attr('stroke', 'var(--ui-border)')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .merge(linkSel)

  const nodeSel = gNode!
    .selectAll<SVGGElement, GraphNode>('g.node')
    .data(simNodes, d => d.id)
  nodeSel.exit().remove()

  const nodeEnter = nodeSel.enter().append('g')
    .attr('class', 'node')
    .attr('cursor', 'pointer')
    .call(drag)
    .on('click', (_event, d) => {
      if (d.type === 'group') {
        toggleGroup(d.id)
      } else if (d.type === 'component') {
        if (d.dependsOn && d.dependsOn.length > 0) {
          // Has dependencies — drill down instead of opening detail panel
          toggleComponent(d.id)
        } else {
          // Leaf node — open detail panel
          selectedNode.value = selectedNode.value?.id === d.id ? null : d
        }
      }
    })

    .on('mouseover', (event: MouseEvent, d: GraphNode) => {
      const cEl = containerRef.value
      if (!cEl) return
      const r = cEl.getBoundingClientRect()
      tooltip.value = {
        visible: true,
        x: event.clientX - r.left + 12,
        y: event.clientY - r.top - 8,
        text: d.type === 'group'
          ? (() => {
              const total = d.count ?? 0
              const isExpanded = expandedGroups.value.has(d.id)
              if (!isExpanded) {
                if (hasDependencyData.value) {
                  const directCount = directCountByPm.value.get(d.packageManager ?? 'unknown') ?? 0
                  return `${d.packageManager} — ${directCount} direct of ${total} total — click to expand`
                }
                return `${d.packageManager} — ${total} component${total === 1 ? '' : 's'} — click to expand`
              }
              return `${d.packageManager} — click to collapse`
            })()
          : d.type === 'component'
            ? (() => {
                const base = `${d.label}${d.version ? ' v' + d.version : ''}`
                if (!hasDependencyData.value) return base
                const tag = d.direct ? ' (direct)' : ' (transitive)'
                const deps = d.dependsOn?.length ?? 0
                return deps > 0 ? `${base}${tag} — ${deps} dep${deps === 1 ? '' : 's'} — click to ${expandedComponents.value.has(d.id) ? 'collapse' : 'expand'}` : `${base}${tag}`
              })()
            : d.label,
      }
    })
    .on('mousemove', (event: MouseEvent) => {
      const cEl = containerRef.value
      if (!cEl) return
      const r = cEl.getBoundingClientRect()
      tooltip.value.x = event.clientX - r.left + 12
      tooltip.value.y = event.clientY - r.top - 8
    })
    .on('mouseout', () => { tooltip.value.visible = false })

  nodeEnter.each(function(d) {
    const g = d3.select(this)
    if (d.type === 'system') {
      g.append('polygon').attr('points', `0,${-22} ${22},0 0,${22} ${-22},0`)
        .attr('fill', 'var(--ui-primary)').attr('stroke', 'var(--ui-bg)').attr('stroke-width', 2)
    } else if (d.type === 'group') {
      g.append('circle').attr('r', 18)
        .attr('fill', pmColor(d.packageManager)).attr('fill-opacity', 0.85)
        .attr('stroke', 'var(--ui-bg)').attr('stroke-width', 2)
    } else if (d.type === 'technology') {
      g.append('rect').attr('x', -10).attr('y', -10).attr('width', 20).attr('height', 20).attr('rx', 3)
        .attr('fill', 'var(--ui-primary)').attr('fill-opacity', 0.4)
        .attr('stroke', 'var(--ui-primary)').attr('stroke-width', 1.5)
    } else {
      // Direct deps: full size + white ring; transitive: smaller + dimmed
      const isDirect = !hasDependencyData.value || d.direct === true
      const r = isDirect ? 7 : 5
      const opacity = isDirect ? 0.9 : 0.5
      g.append('circle').attr('r', r)
        .attr('fill', pmColor(d.packageManager)).attr('fill-opacity', opacity)
        .attr('stroke', isDirect ? 'var(--ui-bg)' : 'none').attr('stroke-width', 1.5)
    }
    g.append('text')
      .attr('dy', d.type === 'system' ? 32 : d.type === 'group' ? 28 : 18)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', 'var(--ui-text)').attr('pointer-events', 'none').attr('user-select', 'none')
      .text(d.type === 'group'
        ? truncate(`${d.packageManager ?? 'unknown'} (${d.count})`, 16)
        : truncate(d.label, 14))
  })

  const nodes = nodeEnter.merge(nodeSel)

  simulation = d3.forceSimulation<GraphNode>(simNodes)
    .force('link', d3.forceLink<GraphNode, { source: GraphNode; target: GraphNode }>(simEdges)
      .id(d => d.id)
      .distance(d => {
        const s = d.source as GraphNode; const t = d.target as GraphNode
        if (s.type === 'system' || t.type === 'system') return 130
        if (s.type === 'group' || t.type === 'group') return 90
        return 60
      })
    )
    .force('charge', d3.forceManyBody<GraphNode>().strength(d => {
      if (d.type === 'system') return -600
      if (d.type === 'group') return -300
      return -80
    }))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<GraphNode>().radius(d => nodeRadius(d) + 8))
    .on('tick', () => {
      simNodes.forEach(n => {
        if (n.x !== undefined && n.y !== undefined) positionCache.set(n.id, { x: n.x, y: n.y })
      })
      links
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)
      nodes.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })
}

// ── Reset zoom ─────────────────────────────────────────────────────────────

function resetZoom() {
  const svgEl = svgRef.value
  if (!svgEl || !zoomBehavior) return
  d3.select(svgEl).transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity)
}

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  if (!hasNodes.value) return
  if (!gLink || !gNode) {
    if (!initSvg()) return
  }
  updateGraph()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => render())

watch(svgRef, (el) => { if (el) render() }, { flush: 'post' })

// Watch only the derived computeds — they already depend on props.nodes/edges
// and expand state, so watching the raw props too would double-fire render().
watch(
  [visibleNodes, visibleEdges],
  () => render(),
  { flush: 'post' }
)

onBeforeUnmount(() => {
  simulation?.stop()
})
</script>
