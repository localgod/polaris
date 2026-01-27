<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <NuxtLink to="/components" style="display: inline-block; margin-bottom: 1rem;">← Back to Components</NuxtLink>
        <h1>Unmapped Components</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Components not yet mapped to approved technologies</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading unmapped components...</p>
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
            <p class="text-sm text-muted">Unmapped Components</p>
            <p class="text-3xl font-bold text-warning" style="margin-top: 0.5rem;">{{ data.count }}</p>
          </div>
        </UiCard>

        <UiCard v-if="data.count === 0">
          <div class="text-center" style="padding: 2rem;">
            <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 style="margin-top: 1rem;">All Components Mapped!</h3>
            <p class="text-muted" style="margin-top: 0.5rem;">Every component is mapped to an approved technology.</p>
          </div>
        </UiCard>

        <UiCard v-else>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Package Manager</th>
                <th>System</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="component in data.data" :key="`${component.name}-${component.version}`">
                <td><strong>{{ component.name }}</strong></td>
                <td><code>{{ component.version }}</code></td>
                <td>{{ component.packageManager }}</td>
                <td>{{ component.system || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface UnmappedComponent {
  name: string
  version: string
  packageManager: string
  system: string
}

interface UnmappedResponse {
  success: boolean
  data: UnmappedComponent[]
  count: number
}

const { data, pending, error } = await useFetch<UnmappedResponse>('/api/components/unmapped')

useHead({ title: 'Unmapped Components - Polaris' })
</script>
