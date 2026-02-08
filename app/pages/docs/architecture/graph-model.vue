<template>
  <div class="space-y-6">
    <UPageHeader
      title="Graph Model"
      description="Neo4j data model and relationships"
    />

    <UCard>
      <div>
        <h2>Overview</h2>
        <p>Polaris uses Neo4j, a graph database, to model the relationships between technologies, systems, teams, and policies. This enables powerful queries about technology usage and compliance.</p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold m-0">Graph Visualization</h2>
      </template>
      <div ref="mermaidEl" class="flex justify-center items-center min-h-50 p-6 overflow-x-auto" />
    </UCard>

    <UCard>
      <div>
        <h2>Core Nodes</h2>
        <ul>
          <li><strong>Technology</strong> — Approved technologies with versions and metadata</li>
          <li><strong>System</strong> — Deployable applications and services</li>
          <li><strong>Component</strong> — SBOM entries (libraries, packages)</li>
          <li><strong>Team</strong> — Organizational teams</li>
          <li><strong>Policy</strong> — Governance rules and constraints</li>
          <li><strong>License</strong> — Software licenses</li>
          <li><strong>Version</strong> — Specific versions of technologies</li>
          <li><strong>Repository</strong> — Source code repositories</li>
          <li><strong>AuditLog</strong> — Change tracking entries</li>
        </ul>

        <h2>Key Relationships</h2>
        <ul>
          <li><code>Team -[:STEWARDED_BY]-&gt; Technology</code> — Technical governance responsibility</li>
          <li><code>Team -[:OWNS]-&gt; System</code> — Operational ownership</li>
          <li><code>Team -[:USES]-&gt; Technology</code> — Actual technology usage</li>
          <li><code>Team -[:APPROVES]-&gt; Technology | Version</code> — TIME framework approval</li>
          <li><code>Team -[:MAINTAINS]-&gt; Repository</code> — Repository maintenance</li>
          <li><code>Technology -[:HAS_VERSION]-&gt; Version</code> — Version tracking</li>
          <li><code>Component -[:IS_VERSION_OF]-&gt; Technology</code> — Component to technology mapping</li>
          <li><code>System -[:USES]-&gt; Component</code> — System dependencies</li>
          <li><code>System -[:HAS_SOURCE_IN]-&gt; Repository</code> — Source code location</li>
          <li><code>Policy -[:GOVERNS]-&gt; Technology</code> — Policy scope</li>
          <li><code>AuditLog -[:PERFORMED_BY]-&gt; User</code> — Who made the change</li>
          <li><code>AuditLog -[:AUDITS]-&gt; Entity</code> — What was changed</li>
        </ul>

        <h2>Query Examples</h2>
        <p>The graph model enables queries like:</p>
        <ul>
          <li>Find all systems using a deprecated technology</li>
          <li>List teams affected by a license policy change</li>
          <li>Trace component dependencies across systems</li>
          <li>Identify compliance violations</li>
          <li>Track all changes made by a specific user</li>
        </ul>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

useHead({
  title: 'Graph Model - Polaris'
})

const mermaidEl = ref<HTMLElement | null>(null)

const diagram = `graph TB
    Team[(Team)]
    User[(User)]
    Technology[(Technology)]
    Version[(Version)]
    Component[(Component)]
    System[(System)]
    Repository[(Repository)]
    Policy[(Policy)]
    AuditLog[(Audit Log)]

    Team -->|STEWARDED_BY| Technology
    Team -->|OWNS| System
    Team -->|USES| Technology
    Team -->|APPROVES| Technology
    Team -->|APPROVES| Version
    Team -->|MAINTAINS| Repository
    Team -->|ENFORCES| Policy
    Team -->|SUBJECT_TO| Policy

    User -->|MEMBER_OF| Team

    Technology -->|HAS_VERSION| Version

    Component -->|IS_VERSION_OF| Technology

    System -->|USES| Technology
    System -->|USES| Component
    System -->|HAS_SOURCE_IN| Repository

    Policy -->|GOVERNS| Technology

    AuditLog -->|PERFORMED_BY| User
    AuditLog -->|AUDITS| Technology
    AuditLog -->|AUDITS| Team
    AuditLog -->|AUDITS| Policy
    AuditLog -->|AUDITS| System
    AuditLog -->|AUDITS| Version

    classDef coreNode fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef auditNode fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px

    class Team,User,Technology,Version,Component,System,Repository,Policy coreNode
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
