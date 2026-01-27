<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div class="flex justify-between items-center">
        <div>
          <h1>Components</h1>
          <p class="text-muted" style="margin-top: 0.5rem;">SBOM entries across all systems</p>
        </div>
        <NuxtLink to="/components/unmapped" class="btn btn-secondary">View Unmapped</NuxtLink>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading components...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <UiCard>
          <div class="text-center">
            <p class="text-sm text-muted">Total Components</p>
            <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ data.count }}</p>
          </div>
        </UiCard>

        <UiCard>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Package Manager</th>
                <th>License</th>
                <th>Type</th>
                <th>Systems</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="component in data.data" :key="`${component.name}-${component.version}`">
                <td><strong>{{ component.name }}</strong></td>
                <td><code>{{ component.version }}</code></td>
                <td>{{ component.packageManager }}</td>
                <td>
                  <template v-if="component.licenses && component.licenses.length > 0">
                    <UiBadge v-for="lic in component.licenses.slice(0, 2)" :key="lic.id || lic.name" variant="neutral" style="margin-right: 0.25rem;">
                      {{ lic.id || lic.name || 'Unknown' }}
                    </UiBadge>
                    <span v-if="component.licenses.length > 2" class="text-muted text-sm">+{{ component.licenses.length - 2 }}</span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <UiBadge v-if="component.type" variant="primary">{{ component.type }}</UiBadge>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>{{ component.systemCount || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Component } from '~~/types/api'

const { data, pending, error } = await useFetch<ApiResponse<Component>>('/api/components')

useHead({ title: 'Components - Polaris' })
</script>
