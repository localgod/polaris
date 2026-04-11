<template>
  <div class="space-y-6">
    <UPageHeader
      title="Graph Model"
      description="Neo4j data model and relationships"
    />

    <!-- Overview -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-git-branch" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Overview</h2>
        </div>
      </template>
      <p class="text-(--ui-text-muted)">
        Polaris uses Neo4j, a graph database, to model the relationships between technologies, systems, teams, and version constraints. This enables powerful queries about technology usage and compliance.
      </p>
    </UCard>

    <!-- Graph Visualization -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-network" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Graph Visualization</h2>
        </div>
      </template>
      <div ref="mermaidEl" class="flex justify-center items-center min-h-50 p-6 overflow-x-auto" />
    </UCard>

    <!-- Core Nodes -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-circle-dot" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Core Nodes</h2>
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UPageFeature
          v-for="node in coreNodes"
          :key="node.title"
          :icon="node.icon"
          :title="node.title"
          :description="node.description"
          orientation="horizontal"
        />
      </div>
    </UCard>

    <!-- Key Relationships -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-arrow-right" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Key Relationships</h2>
        </div>
      </template>
      <div class="space-y-3">
        <div
          v-for="rel in keyRelationships"
          :key="rel.label"
          class="flex items-start gap-3"
        >
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-(--ui-primary) shrink-0 mt-1" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium">{{ rel.description }}</span>
              <UBadge :label="rel.label" variant="subtle" color="neutral" size="xs" />
            </div>
            <p class="text-sm text-(--ui-text-muted) mt-0.5">{{ rel.detail }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Query Examples -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-search" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Query Examples</h2>
        </div>
      </template>
      <div class="space-y-3">
        <UPageFeature
          v-for="example in queryExamples"
          :key="example.title"
          icon="i-lucide-search"
          :title="example.title"
          orientation="horizontal"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// --- Core Nodes ---
const coreNodes = [
  { icon: 'i-lucide-settings', title: 'Technology', description: 'Approved technologies with versions and metadata' },
  { icon: 'i-lucide-cpu', title: 'System', description: 'Deployable applications and services' },
  { icon: 'i-lucide-box', title: 'Component', description: 'SBOM entries (libraries, packages)' },
  { icon: 'i-lucide-users', title: 'Team', description: 'Organizational teams' },
  { icon: 'i-lucide-git-branch', title: 'VersionConstraint', description: 'Version range constraints for technologies' },
  { icon: 'i-lucide-scale', title: 'License', description: 'Software licenses' },
  { icon: 'i-lucide-tag', title: 'Version', description: 'Specific versions of technologies' },
  { icon: 'i-lucide-folder-git', title: 'Repository', description: 'Source code repositories' },
  { icon: 'i-lucide-clipboard-list', title: 'AuditLog', description: 'Change tracking entries' },
]

// --- Key Relationships ---
const keyRelationships = [
  { label: 'STEWARDED_BY', description: 'Team stewards Technology', detail: 'Technical governance responsibility' },
  { label: 'OWNS', description: 'Team owns System', detail: 'Operational ownership' },
  { label: 'USES', description: 'Team uses Technology', detail: 'Actual technology usage by a team' },
  { label: 'APPROVES', description: 'Team approves Technology or Version', detail: 'TIME framework approval' },
  { label: 'MAINTAINS', description: 'Team maintains Repository', detail: 'Repository maintenance responsibility' },
  { label: 'HAS_VERSION', description: 'Technology has Version', detail: 'Version tracking per technology' },
  { label: 'IS_VERSION_OF', description: 'Component is version of Technology', detail: 'Component to technology mapping' },
  { label: 'USES', description: 'System uses Component', detail: 'System dependency on a component' },
  { label: 'HAS_SOURCE_IN', description: 'System has source in Repository', detail: 'Source code location' },
  { label: 'GOVERNS', description: 'VersionConstraint governs Technology', detail: 'Constraint scope' },
  { label: 'PERFORMED_BY', description: 'AuditLog performed by User', detail: 'Who made the change' },
  { label: 'AUDITS', description: 'AuditLog audits Entity', detail: 'What was changed' },
]

// --- Query Examples ---
const queryExamples = [
  { title: 'Find all systems using a deprecated technology' },
  { title: 'List teams affected by a license rule change' },
  { title: 'Trace component dependencies across systems' },
  { title: 'Identify compliance violations' },
  { title: 'Track all changes made by a specific user' },
]

useHead({ title: 'Graph Model - Polaris' })

const mermaidEl = ref<HTMLElement | null>(null)

const diagram = `graph TB
    Team[(Team)]
    User[(User)]
    Technology[(Technology)]
    Version[(Version)]
    Component[(Component)]
    System[(System)]
    Repository[(Repository)]
    VersionConstraint[(VersionConstraint)]
    AuditLog[(Audit Log)]

    Team -->|STEWARDED_BY| Technology
    Team -->|OWNS| System
    Team -->|USES| Technology
    Team -->|APPROVES| Technology
    Team -->|APPROVES| Version
    Team -->|MAINTAINS| Repository
    Team -->|ENFORCES| VersionConstraint
    Team -->|SUBJECT_TO| VersionConstraint

    User -->|MEMBER_OF| Team

    Technology -->|HAS_VERSION| Version

    Component -->|IS_VERSION_OF| Technology

    System -->|USES| Technology
    System -->|USES| Component
    System -->|HAS_SOURCE_IN| Repository

    VersionConstraint -->|GOVERNS| Technology

    AuditLog -->|PERFORMED_BY| User
    AuditLog -->|AUDITS| Technology
    AuditLog -->|AUDITS| Team
    AuditLog -->|AUDITS| VersionConstraint
    AuditLog -->|AUDITS| System
    AuditLog -->|AUDITS| Version

    classDef coreNode fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef auditNode fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px

    class Team,User,Technology,Version,Component,System,Repository,VersionConstraint coreNode
    class AuditLog auditNode`

onMounted(async () => {
  if (!mermaidEl.value) return

  const mermaid = (await import('mermaid')).default
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
  })

  try {
    const { svg } = await mermaid.render('graph-model-diagram', diagram)
    mermaidEl.value.innerHTML = svg
  }
  catch (error) {
    console.error('Mermaid rendering error:', error)
    if (mermaidEl.value) {
      mermaidEl.value.textContent = 'Failed to render diagram'
    }
  }
})
</script>

<style scoped>
div :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
