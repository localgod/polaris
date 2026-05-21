<template>
  <div ref="containerRef" class="relative w-full">
    <svg ref="svgRef" class="w-full" :viewBox="viewBox" />

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="absolute pointer-events-none z-10 px-2 py-1.5 rounded text-xs bg-(--ui-bg) border border-(--ui-border) shadow-md text-(--ui-text) max-w-56"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -110%)' }"
    >
      <p class="font-medium">{{ tooltip.name }}</p>
      <p v-if="tooltip.domain" class="text-(--ui-text-muted)">{{ tooltip.domain }}</p>
      <p v-if="tooltip.type" class="text-(--ui-text-muted)">{{ tooltip.type }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { select } from 'd3'
import type { RadarTechnology } from '~~/server/services/technology.service'

const props = defineProps<{ data: RadarTechnology[] }>()

// ── Constants ────────────────────────────────────────────────────────────────

const SIZE = 800
const CX = SIZE / 2
const CY = SIZE / 2
const MARGIN = 30  // padding around the outermost label

// Ring order: innermost = invest, outermost = unclassified
const RINGS: Array<{ key: string; label: string; color: string }> = [
  { key: 'invest',       label: 'Invest',       color: 'var(--ui-color-success-500, #22c55e)' },
  { key: 'tolerate',     label: 'Tolerate',     color: 'var(--ui-color-warning-500, #f59e0b)' },
  { key: 'migrate',      label: 'Migrate',      color: 'var(--ui-color-warning-600, #d97706)' },
  { key: 'eliminate',    label: 'Eliminate',    color: 'var(--ui-color-error-500, #ef4444)' },
  { key: 'unclassified', label: 'Unclassified', color: 'var(--ui-color-neutral-400, #9ca3af)' },
]

const DOMAINS = [
  'foundational-runtime',
  'framework',
  'data-platform',
  'integration-platform',
  'security-identity',
  'infrastructure',
  'observability',
  'developer-tooling',
  'other',
]

const RING_INNER_RADIUS = 60
const LABEL_SPACE = 110  // space reserved outside the outer ring for domain labels
const RING_OUTER_RADIUS = CX - LABEL_SPACE
const RING_BAND = (RING_OUTER_RADIUS - RING_INNER_RADIUS) / RINGS.length

const BLIP_RADIUS = 6
const SECTOR_ANGLE = (2 * Math.PI) / DOMAINS.length

// ── Template refs ────────────────────────────────────────────────────────────

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// Tight viewBox: crop to the full content extent including label space, minus the
// unused margin that was originally between labels and the SVG edge.
const contentRadius = RING_OUTER_RADIUS + LABEL_SPACE - MARGIN
const viewBox = computed(() => `${CX - contentRadius} ${CY - contentRadius} ${contentRadius * 2} ${contentRadius * 2}`)

// ── Tooltip state ────────────────────────────────────────────────────────────

const tooltip = ref({ visible: false, x: 0, y: 0, name: '', domain: '', type: '' })

// ── Seeded pseudo-random jitter (deterministic per technology name) ───────────

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0
    return ((h >>> 0) / 0xffffffff)
  }
}

// ── Draw ─────────────────────────────────────────────────────────────────────

function draw() {
  const svgEl = svgRef.value
  if (!svgEl) return

  const svg = select(svgEl)
  svg.selectAll('*').remove()

  const g = svg.append('g')

  // ── Background rings ──────────────────────────────────────────────────────
  RINGS.forEach((ring, ri) => {
    const inner = RING_INNER_RADIUS + ri * RING_BAND
    const outer = inner + RING_BAND

    // Alternating subtle fill for readability
    g.append('circle')
      .attr('cx', CX).attr('cy', CY)
      .attr('r', outer)
      .attr('fill', ri % 2 === 0 ? 'var(--ui-bg-elevated, #f9fafb)' : 'var(--ui-bg, #ffffff)')
      .attr('stroke', 'var(--ui-border, #e5e7eb)')
      .attr('stroke-width', 1)
  })

  // Centre hole
  g.append('circle')
    .attr('cx', CX).attr('cy', CY)
    .attr('r', RING_INNER_RADIUS)
    .attr('fill', 'var(--ui-bg, #ffffff)')
    .attr('stroke', 'var(--ui-border, #e5e7eb)')
    .attr('stroke-width', 1)

  // ── Sector dividers ───────────────────────────────────────────────────────
  DOMAINS.forEach((_, di) => {
    const angle = di * SECTOR_ANGLE - Math.PI / 2
    const x1 = CX + RING_INNER_RADIUS * Math.cos(angle)
    const y1 = CY + RING_INNER_RADIUS * Math.sin(angle)
    const x2 = CX + RING_OUTER_RADIUS * Math.cos(angle)
    const y2 = CY + RING_OUTER_RADIUS * Math.sin(angle)
    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', 'var(--ui-border, #e5e7eb)')
      .attr('stroke-width', 1)
  })

  // ── Ring labels (TIME category) ───────────────────────────────────────────
  RINGS.forEach((ring, ri) => {
    const inner = RING_INNER_RADIUS + ri * RING_BAND
    const mid = inner + RING_BAND / 2
    g.append('text')
      .attr('x', CX)
      .attr('y', CY - mid)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', '600')
      .attr('fill', ring.color)
      .attr('opacity', 0.85)
      .text(ring.label)
  })

  // ── Sector labels (domain name) ───────────────────────────────────────────
  DOMAINS.forEach((domain, di) => {
    const midAngle = (di + 0.5) * SECTOR_ANGLE - Math.PI / 2
    const labelR = RING_OUTER_RADIUS + 16
    const lx = CX + labelR * Math.cos(midAngle)
    const ly = CY + labelR * Math.sin(midAngle)

    const anchor = Math.cos(midAngle) > 0.1 ? 'start'
      : Math.cos(midAngle) < -0.1 ? 'end'
      : 'middle'

    g.append('text')
      .attr('x', lx).attr('y', ly)
      .attr('text-anchor', anchor)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 9)
      .attr('fill', 'var(--ui-text-muted, #6b7280)')
      .text(domain)
  })

  // ── Blips ─────────────────────────────────────────────────────────────────
  props.data.forEach(tech => {
    const ringIndex = RINGS.findIndex(r => r.key === tech.timeValue)
    if (ringIndex === -1) return

    const domainIndex = tech.domain ? DOMAINS.indexOf(tech.domain) : DOMAINS.indexOf('other')
    const di = domainIndex === -1 ? DOMAINS.indexOf('other') : domainIndex

    const ring = RINGS[ringIndex]!
    const inner = RING_INNER_RADIUS + ringIndex * RING_BAND + BLIP_RADIUS + 4
    const outer = inner + RING_BAND - BLIP_RADIUS * 2 - 8

    const rng = seededRandom(tech.name)
    const r = inner + rng() * Math.max(0, outer - inner)
    const sectorStart = di * SECTOR_ANGLE - Math.PI / 2
    const angle = sectorStart + (0.1 + rng() * 0.8) * SECTOR_ANGLE

    const bx = CX + r * Math.cos(angle)
    const by = CY + r * Math.sin(angle)

    const blip = g.append('circle')
      .attr('cx', bx).attr('cy', by)
      .attr('r', BLIP_RADIUS)
      .attr('fill', ring.color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'var(--ui-bg, #ffffff)')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')

    blip
      .on('mouseenter', (event: MouseEvent) => {
        select(event.currentTarget as SVGCircleElement)
          .attr('r', BLIP_RADIUS + 2)
          .attr('fill-opacity', 1)

        const rect = containerRef.value!.getBoundingClientRect()
        tooltip.value = {
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          name: tech.name,
          domain: tech.domain ?? '',
          type: tech.type ?? '',
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        const rect = containerRef.value!.getBoundingClientRect()
        tooltip.value.x = event.clientX - rect.left
        tooltip.value.y = event.clientY - rect.top
      })
      .on('mouseleave', (event: MouseEvent) => {
        select(event.currentTarget as SVGCircleElement)
          .attr('r', BLIP_RADIUS)
          .attr('fill-opacity', 0.85)
        tooltip.value.visible = false
      })
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(draw)
watch(() => props.data, draw, { deep: true })

let ro: ResizeObserver | null = null
onMounted(() => {
  if (containerRef.value) {
    ro = new ResizeObserver(draw)
    ro.observe(containerRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>
