<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Policy Violations</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Technologies and licenses used without approval</p>
        </div>
        <NuxtLink 
          to="/violations/licenses"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          View License Violations
        </NuxtLink>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading violations...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data?.data">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Total Violations</p>
              <p class="mt-1 text-3xl font-bold text-error-600 dark:text-error-400">{{ data.data.summary.totalViolations }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Teams Affected</p>
              <p class="mt-1 text-3xl font-bold text-warning-600 dark:text-warning-400">{{ data.data.summary.teamsAffected }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Technologies</p>
              <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ data.data.violations.length }}</p>
            </div>
          </UiCard>
        </div>

        <UiCard v-if="data.data.summary.totalViolations === 0">
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Violations!</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">All technologies are properly approved.</p>
          </div>
        </UiCard>

        <div v-else class="grid grid-cols-1 gap-6">
          <UiCard v-for="violation in data.data.violations" :key="`${violation.team}-${violation.technology}`">
            <template #header>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ violation.technology }}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300">{{ violation.category }}</p>
                </div>
                <UiBadge variant="error" size="sm">{{ violation.violationType }}</UiBadge>
              </div>
            </template>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600 dark:text-gray-300">Team:</span>
                  <span class="ml-2 text-gray-900 dark:text-white font-medium">{{ violation.team }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-300">Systems Affected:</span>
                  <span class="ml-2 text-gray-900 dark:text-white font-medium">{{ violation.systemCount }}</span>
                </div>
              </div>
              <div v-if="violation.systems && violation.systems.length > 0" class="text-sm">
                <span class="text-gray-600 dark:text-gray-300">Systems:</span>
                <div class="mt-1 flex flex-wrap gap-2">
                  <span v-for="system in violation.systems" :key="system" class="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                    {{ system }}
                  </span>
                </div>
              </div>
              <div v-if="violation.notes" class="mt-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                <p class="text-sm text-error-800 dark:text-error-300">{{ violation.notes }}</p>
              </div>
              <div v-if="violation.migrationTarget" class="mt-2 text-sm">
                <span class="text-gray-600 dark:text-gray-300">Migration Target:</span>
                <span class="ml-2 text-primary-600 dark:text-primary-400 font-medium">{{ violation.migrationTarget }}</span>
              </div>
            </div>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface ComplianceViolation {
  team: string
  technology: string
  category: string
  systemCount: number
  systems: string[]
  violationType: string
  notes: string | null
  migrationTarget: string | null
}

interface ViolationsResponse {
  success: boolean
  data: {
    violations: ComplianceViolation[]
    summary: {
      totalViolations: number
      teamsAffected: number
      byTeam: Array<{
        team: string
        violationCount: number
        systemsAffected: number
      }>
    }
  }
}

const { data, pending, error } = await useFetch<ViolationsResponse>('/api/compliance/violations')
useHead({ title: 'Violations - Polaris' })
</script>
