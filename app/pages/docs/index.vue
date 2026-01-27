<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>Documentation</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Learn about Polaris features and architecture</p>
      </div>

      <div class="grid grid-cols-2">
        <UiCard>
          <template #header>
            <h2>Features</h2>
          </template>
          <div class="space-y" style="--space: 0.5rem;">
            <NuxtLink to="/docs/features/time-framework" style="display: block; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.375rem;">
              <strong>TIME Framework</strong>
              <p class="text-sm text-muted">Technology lifecycle management</p>
            </NuxtLink>
            <NuxtLink to="/docs/features/team-approvals" style="display: block; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.375rem;">
              <strong>Team Approvals</strong>
              <p class="text-sm text-muted">Approval workflow for technologies</p>
            </NuxtLink>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h2>Architecture</h2>
          </template>
          <div class="space-y" style="--space: 0.5rem;">
            <NuxtLink to="/docs/architecture/graph-model" style="display: block; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.375rem;">
              <strong>Graph Model</strong>
              <p class="text-sm text-muted">Neo4j data model and relationships</p>
            </NuxtLink>
            <NuxtLink to="/api-reference" style="display: block; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.375rem;">
              <strong>API Reference</strong>
              <p class="text-sm text-muted">REST API documentation</p>
            </NuxtLink>
          </div>
        </UiCard>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({ title: 'Documentation - Polaris' })
</script>
