<template>
  <div class="space-y">
    <div class="page-header">
      <NuxtLink to="/docs" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Documentation</NuxtLink>
      <h1>Graph Model</h1>
      <p>Neo4j data model and relationships</p>
    </div>
    
    <UiCard>
      <div class="prose">
        <h2>Overview</h2>
        <p>Polaris uses Neo4j, a graph database, to model the relationships between technologies, systems, teams, and policies. This enables powerful queries about technology usage and compliance.</p>
        
        <h2>Core Nodes</h2>
        <ul>
          <li><strong>Technology</strong> - Approved technologies with versions and metadata</li>
          <li><strong>System</strong> - Deployable applications and services</li>
          <li><strong>Component</strong> - SBOM entries (libraries, packages)</li>
          <li><strong>Team</strong> - Organizational teams</li>
          <li><strong>Policy</strong> - Governance rules and constraints</li>
          <li><strong>License</strong> - Software licenses</li>
        </ul>

        <h2>Key Relationships</h2>
        <ul>
          <li><code>Team -[:OWNS]-> System</code> - Team ownership of systems</li>
          <li><code>Team -[:STEWARDED_BY]-> Technology</code> - Technology stewardship</li>
          <li><code>System -[:USES]-> Component</code> - System dependencies</li>
          <li><code>Component -[:IS_VERSION_OF]-> Technology</code> - Component to technology mapping</li>
          <li><code>Component -[:LICENSED_UNDER]-> License</code> - License associations</li>
          <li><code>Policy -[:GOVERNS]-> Technology</code> - Policy scope</li>
        </ul>

        <h2>Query Examples</h2>
        <p>The graph model enables queries like:</p>
        <ul>
          <li>Find all systems using a deprecated technology</li>
          <li>List teams affected by a license policy change</li>
          <li>Trace component dependencies across systems</li>
          <li>Identify compliance violations</li>
        </ul>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Graph Model - Polaris'
})
</script>
