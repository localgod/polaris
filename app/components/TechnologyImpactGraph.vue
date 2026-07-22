<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <div v-if="!hasNodes" class="text-center py-12 text-(--ui-text-muted)">
      <UIcon name="i-lucide-share-2" class="text-4xl mb-3" />
      <p>No systems use this technology.</p>
    </div>

    <template v-else>
      <!-- Legend -->
      <div class="flex flex-wrap gap-3 text-sm">
        <div v-for="ring in TIME_RINGS" :key="ring.key" class="flex items-center gap-1.5">
          <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" :style="{ background: ring.color }" />
          <span class="text-(--ui-text-muted)">{{ ring.label }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block w-3 h-3 rounded-full flex-shrink-0"
            :style="{ background: GAP_COLOR, border: `1.5px dashed ${GAP_STROKE}` }"
          />
          <span class="text-(--ui-text-muted)">Compliance gap (no approval)</span>
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
          class="absolute pointer-events-none z-10 px-2 py-1 rounded text-xs bg-(--ui-bg) border border-(--ui-border) shadow-sm text-(--ui-text) max-w-56"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >{{ tooltip.text }}</div>

        <p class="absolute bottom-2 right-3 text-xs text-(--ui-text-muted) pointer-events-none select-none">
          Scroll to zoom · Drag to pan · Double-click to reset
        </p>
      </div>

      <!-- Detail panel -->
      <UCard v-if="selectedNode">
        <template #header>
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-base">{{ selectedNode.label }}</h3>
              <p v-if="selectedNode.type === 'system' && selectedNode.versions?.length" class="text-sm text-(--ui-text-muted)">
                v{{ selectedNode.versions.join(', v') }}
              </p>
              <p v-else-if="selectedNode.type === 'team'" class="text-sm text-(--ui-text-muted)">
                {{ selectedNode.systemCount }} system{{ selectedNode.systemCount === 1 ? '' : 's' }}
              </p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" size="xs" color="neutral" @click="selectedNode = null" />
          </div>
        </template>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div v-if="selectedNode.type === 'system' && selectedNode.ownerTeamName">
            <span class="text-(--ui-text-muted) block">Owning Team</span>
            <NuxtLink
              :to="`/teams/${encodeURIComponent(selectedNode.ownerTeamName)}`"
              class="font-medium hover:underline text-(--ui-primary)"
            >{{ selectedNode.ownerTeamName }}</NuxtLink>
          </div>
          <div v-if="selectedNode.type === 'system'">
            <span class="text-(--ui-text-muted) block">System</span>
            <NuxtLink
              :to="`/systems/${encodeURIComponent(selectedNode.label)}`"
              class="font-medium hover:underline text-(--ui-primary)"
            >{{ selectedNode.label }}</NuxtLink>
          </div>
          <div v-if="selectedNode.type === 'system' && selectedNode.environment">
            <span class="text-(--ui-text-muted) block">Environment</span>
            <span class="font-medium">{{ selectedNode.environment }}</span>
          </div>
          <div v-if="!selectedNode.complianceGap">
            <span class="text-(--ui-text-muted) block">TIME</span>
            <UBadge :color="getTimeCategoryColor(selectedNode.time)" variant="subtle">{{ selectedNode.time ?? 'unclassified' }}</UBadge>
          </div>
        </div>

        <UAlert
          v-if="selectedNode.complianceGap"
          class="mt-4"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="selectedNode.type === 'system'
            ? `No approval from ${selectedNode.ownerTeamName ?? 'an owning team'} for this technology`
            : 'No system under this team has an approval for this technology'"
        />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  select,
  zoom,
  zoomIdentity,
  drag,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3'
import type { Selection, Simulation, ZoomBehavior } from 'd3'
import type { ImpactGraphNode, ImpactGraphEdge } from '../utils/technology-impact-graph'

type SimNode = ImpactGraphNode & { x?: number; y?: number; fx?: number | null; fy?: number | null }

// ── Props ──────────────────────────────────────────────────────────────────

const props = defineProps<{
  technologyName: string
  nodes: ImpactGraphNode[]
  edges: ImpactGraphEdge[]
}>()

// ── Template refs ──────────────────────────────────────────────────────────

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const hasNodes = computed(() => props.nodes.length > 0)

// ── Colors ─────────────────────────────────────────────────────────────────

const TIME_RINGS: Array<{ key: string; label: string; color: string }> = [
  { key: 'invest', label: 'Invest', color: 'var(--ui-color-success-500, #22c55e)' },
  { key: 'tolerate', label: 'Tolerate', color: 'var(--ui-color-warning-500, #f59e0b)' },
  { key: 'migrate', label: 'Migrate', color: 'var(--ui-color-warning-600, #d97706)' },
  { key: 'eliminate', label: 'Eliminate', color: 'var(--ui-color-error-500, #ef4444)' },
]
const TIME_COLORS: Record<string, string> = Object.fromEntries(TIME_RINGS.map(r => [r.key, r.color]))
const GAP_COLOR = 'var(--ui-color-neutral-400, #9ca3af)'
const GAP_STROKE = 'var(--ui-color-neutral-500, #6b7280)'

function nodeColor(n: ImpactGraphNode): string {
  if (n.complianceGap) return GAP_COLOR
  return (n.time && TIME_COLORS[n.time]) || GAP_COLOR
}

// ── D3 state ───────────────────────────────────────────────────────────────

const positionCache = new Map<string, { x: number; y: number }>()
let simulation: Simulation<SimNode, undefined> | null = null
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null
let gRoot: Selection<SVGGElement, unknown, null, undefined> | null = null
let gLink: Selection<SVGGElement, unknown, null, undefined> | null = null
let gNode: Selection<SVGGElement, unknown, null, undefined> | null = null

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })
const selectedNode = ref<ImpactGraphNode | null>(null)

// ── Helpers ────────────────────────────────────────────────────────────────

function nodeRadius(n: ImpactGraphNode): number {
  if (n.type === 'technology') return 22
  if (n.type === 'team') return 16
  return 8
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function tooltipText(n: ImpactGraphNode): string {
  const status = n.complianceGap ? 'Compliance gap — no approval' : (n.time ?? 'unclassified')
  if (n.type === 'technology') return n.label
  if (n.type === 'team') return `${n.label} — ${n.systemCount} system${n.systemCount === 1 ? '' : 's'} — ${status}`
  const versions = n.versions?.length ? ` v${n.versions.join(', v')}` : ''
  return `${n.label}${versions} — ${n.ownerTeamName ?? 'No owning team'} — ${status}`
}

// ── SVG init ───────────────────────────────────────────────────────────────

function initSvg(): boolean {
  const svgEl = svgRef.value
  if (!svgEl) return false

  const svg = select(svgEl)
  svg.selectAll('*').remove()

  gRoot = svg.append('g').attr('class', 'root')
  gLink = gRoot.append('g').attr('class', 'links')
  gNode = gRoot.append('g').attr('class', 'nodes')

  zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 4])
    .on('zoom', event => gRoot!.attr('transform', event.transform))

  svg.call(zoomBehavior)
  return true
}

// ── Graph update ───────────────────────────────────────────────────────────

function updateGraph() {
  if (!gLink || !gNode) return
  if (props.nodes.length === 0) return

  const containerEl = containerRef.value
  const width = containerEl?.clientWidth || 800
  const height = containerEl?.clientHeight || 520

  const simNodes: SimNode[] = props.nodes.map(n => {
    const cached = positionCache.get(n.id)
    return {
      ...n,
      x: cached?.x ?? width / 2 + (Math.random() - 0.5) * 80,
      y: cached?.y ?? height / 2 + (Math.random() - 0.5) * 80,
    }
  })

  const simNodeById = new Map(simNodes.map(n => [n.id, n]))
  const simEdges = props.edges
    .map(e => ({ ...e, source: simNodeById.get(e.source)!, target: simNodeById.get(e.target)! }))
    .filter(e => e.source && e.target) as unknown as Array<{ source: SimNode; target: SimNode; complianceGap?: boolean }>

  const dragBehavior = drag<SVGGElement, SimNode>()
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
    .selectAll<SVGLineElement, { source: SimNode; target: SimNode; complianceGap?: boolean }>('line')
    .data(simEdges, d => `${d.source.id}→${d.target.id}`)
  linkSel.exit().remove()
  const links = linkSel.enter().append('line')
    .merge(linkSel)
    .attr('stroke', d => d.complianceGap ? GAP_STROKE : 'var(--ui-border)')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('stroke-dasharray', d => d.complianceGap ? '4,2' : null)

  const nodeSel = gNode!
    .selectAll<SVGGElement, SimNode>('g.node')
    .data(simNodes, d => d.id)
  nodeSel.exit().remove()

  const nodeEnter = nodeSel.enter().append('g')
    .attr('class', 'node')
    .attr('cursor', 'pointer')
    .call(dragBehavior)
    .on('click', (_event, d) => {
      if (d.type === 'technology') return
      selectedNode.value = selectedNode.value?.id === d.id ? null : d
    })
    .on('mouseover', (event: MouseEvent, d: SimNode) => {
      const cEl = containerRef.value
      if (!cEl) return
      const r = cEl.getBoundingClientRect()
      tooltip.value = {
        visible: true,
        x: event.clientX - r.left + 12,
        y: event.clientY - r.top - 8,
        text: tooltipText(d),
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

  const nodes = nodeEnter.merge(nodeSel)
  nodes.selectAll('*').remove()
  nodes.each(function(d) {
    const g = select(this)
    if (d.type === 'technology') {
      g.append('polygon').attr('points', `0,${-22} ${22},0 0,${22} ${-22},0`)
        .attr('fill', 'var(--ui-primary)').attr('stroke', 'var(--ui-bg)').attr('stroke-width', 2)
    } else if (d.type === 'team') {
      g.append('circle').attr('r', 16)
        .attr('fill', nodeColor(d)).attr('fill-opacity', 0.85)
        .attr('stroke', d.complianceGap ? GAP_STROKE : 'var(--ui-bg)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d.complianceGap ? '3,2' : null)
    } else {
      g.append('circle').attr('r', 8)
        .attr('fill', nodeColor(d)).attr('fill-opacity', 0.9)
        .attr('stroke', d.complianceGap ? GAP_STROKE : 'var(--ui-bg)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', d.complianceGap ? '3,2' : null)
    }
    g.append('text')
      .attr('dy', d.type === 'technology' ? 34 : d.type === 'team' ? 28 : 18)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', 'var(--ui-text)').attr('pointer-events', 'none').attr('user-select', 'none')
      .text(truncate(d.label, 16))
  })

  if (!simulation) {
    simulation = forceSimulation<SimNode>(simNodes)
      .force('link', forceLink<SimNode, { source: SimNode; target: SimNode }>(simEdges)
        .id(d => d.id)
        .distance(d => {
          const s = d.source as SimNode; const t = d.target as SimNode
          if (s.type === 'technology' || t.type === 'technology') return 140
          return 80
        })
      )
      .force('charge', forceManyBody<SimNode>().strength(d => {
        if (d.type === 'technology') return -700
        if (d.type === 'team') return -350
        return -100
      }))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>().radius(d => nodeRadius(d) + 8))
      .on('tick', () => {
        simNodes.forEach(n => {
          if (n.x !== undefined && n.y !== undefined) positionCache.set(n.id, { x: n.x, y: n.y })
        })
        links
          .attr('x1', d => (d.source as SimNode).x ?? 0)
          .attr('y1', d => (d.source as SimNode).y ?? 0)
          .attr('x2', d => (d.target as SimNode).x ?? 0)
          .attr('y2', d => (d.target as SimNode).y ?? 0)
        nodes.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })
  } else {
    simulation.nodes(simNodes)
    ;(simulation.force('link') as ReturnType<typeof forceLink<SimNode, { source: SimNode; target: SimNode }>>)
      ?.links(simEdges)
    simulation.force('center', forceCenter(width / 2, height / 2))
    simulation
      .on('tick', () => {
        simNodes.forEach(n => {
          if (n.x !== undefined && n.y !== undefined) positionCache.set(n.id, { x: n.x, y: n.y })
        })
        links
          .attr('x1', d => (d.source as SimNode).x ?? 0)
          .attr('y1', d => (d.source as SimNode).y ?? 0)
          .attr('x2', d => (d.target as SimNode).x ?? 0)
          .attr('y2', d => (d.target as SimNode).y ?? 0)
        nodes.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })
      .alpha(0.3)
      .restart()
  }
}

// ── Reset zoom ─────────────────────────────────────────────────────────────

function resetZoom() {
  const svgEl = svgRef.value
  if (!svgEl || !zoomBehavior) return
  select(svgEl).transition().duration(400).call(zoomBehavior.transform, zoomIdentity)
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

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  render()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => render())
    resizeObserver.observe(containerRef.value)
  }
})

watch(svgRef, (el) => { if (el) render() }, { flush: 'post' })

watch(
  [() => props.nodes, () => props.edges],
  () => render(),
  { flush: 'post' }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  simulation?.stop()
})
</script>
