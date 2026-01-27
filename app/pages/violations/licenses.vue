<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <NuxtLink to="/violations" style="display: inline-block; margin-bottom: 1rem;">← Back to Violations</NuxtLink>
        <h1>License Violations</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Components using non-compliant licenses</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;" />
          <p class="text-muted" style="margin-top: 1rem;">Loading license violations...</p>
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
            <p class="text-sm text-muted">Total License Violations</p>
            <p class="text-3xl font-bold text-error" style="margin-top: 0.5rem;">{{ data.count }}</p>
          </div>
        </UiCard>

        <UiCard v-if="data.count === 0">
          <div class="text-center" style="padding: 2rem;">
            <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 style="margin-top: 1rem;">No License Violations!</h3>
            <p class="text-muted" style="margin-top: 0.5rem;">All components use compliant licenses.</p>
          </div>
        </UiCard>

        <UiCard v-else>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>License</th>
                <th>System</th>
                <th>Team</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(violation, index) in data.data" :key="index">
                <td>
                  <strong>{{ violation.component.name }}</strong>
                  <br><code class="text-sm">{{ violation.component.version }}</code>
                </td>
                <td>
                  <UiBadge :variant="getCategoryVariant(violation.license.category)">
                    {{ violation.license.id || violation.license.name }}
                  </UiBadge>
                </td>
                <td>{{ violation.system }}</td>
                <td>{{ violation.team }}</td>
                <td>
                  <UiBadge :variant="getSeverityVariant(violation.policy.severity)">
                    {{ violation.policy.severity }}
                  </UiBadge>
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
interface LicenseViolation {
  team: string
  system: string
  component: {
    name: string
    version: string
    purl: string
  }
  license: {
    id: string
    name: string
    category: string
    osiApproved: boolean
  }
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string
  }
}

interface LicenseViolationsResponse {
  success: boolean
  data: LicenseViolation[]
  count: number
}

const { data, pending, error } = await useFetch<LicenseViolationsResponse>('/api/policies/license-violations')

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
}

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

useHead({ title: 'License Violations - Polaris' })
</script>
