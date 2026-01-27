<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>License Administration</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Manage license definitions and policies</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading licenses...</p>
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
          <table>
            <thead>
              <tr>
                <th>SPDX ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>OSI Approved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="license in data.data" :key="license.spdxId">
                <td><code>{{ license.spdxId }}</code></td>
                <td>{{ license.name }}</td>
                <td>
                  <UiBadge :variant="getCategoryVariant(license.category)">{{ license.category }}</UiBadge>
                </td>
                <td>
                  <UiBadge :variant="license.osiApproved ? 'success' : 'neutral'">
                    {{ license.osiApproved ? 'Yes' : 'No' }}
                  </UiBadge>
                </td>
                <td>
                  <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface License {
  spdxId: string
  name: string
  category: string
  osiApproved: boolean
}

interface LicenseResponse {
  success: boolean
  data: License[]
  count: number
}

const { data, pending, error } = await useFetch<LicenseResponse>('/api/licenses')

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
}

useHead({ title: 'License Administration - Polaris' })
</script>
