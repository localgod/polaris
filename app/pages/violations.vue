<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </NuxtLink>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Policy Violations
        </h1>
        <p class="text-gray-600">
          Technologies used without approval that violate active policies
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading violations...
        </p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3">
          <div class="text-3xl">
            ❌
          </div>
          <div>
            <h3 class="text-lg font-semibold text-red-900">
              Error Loading Violations
            </h3>
            <p class="text-sm text-red-700">
              {{ error.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <!-- Total Violations -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-sm text-gray-600 mb-1">Total Violations</div>
            <div class="text-3xl font-bold text-gray-900">{{ data?.count || 0 }}</div>
          </div>

          <!-- Critical -->
          <div class="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
            <div class="text-sm text-red-700 mb-1">Critical</div>
            <div class="text-3xl font-bold text-red-900">{{ data?.summary.critical || 0 }}</div>
          </div>

          <!-- Error -->
          <div class="bg-orange-50 rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div class="text-sm text-orange-700 mb-1">Error</div>
            <div class="text-3xl font-bold text-orange-900">{{ data?.summary.error || 0 }}</div>
          </div>

          <!-- Warning -->
          <div class="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div class="text-sm text-yellow-700 mb-1">Warning</div>
            <div class="text-3xl font-bold text-yellow-900">{{ data?.summary.warning || 0 }}</div>
          </div>

          <!-- Info -->
          <div class="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div class="text-sm text-blue-700 mb-1">Info</div>
            <div class="text-3xl font-bold text-blue-900">{{ data?.summary.info || 0 }}</div>
          </div>
        </div>

        <!-- No Violations State -->
        <div v-if="!data?.data || data.data.length === 0" class="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">
              ✅
            </div>
            <div>
              <h3 class="text-lg font-semibold text-green-900">
                No Policy Violations
              </h3>
              <p class="text-sm text-green-700">
                All teams are compliant with active policies. Great work!
              </p>
            </div>
          </div>
        </div>

        <!-- Violations List -->
        <div v-else class="space-y-4">
          <div
            v-for="(violation, index) in data.data"
            :key="index"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <!-- Violation Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-semibold',
                      violation.policy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      violation.policy.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                      violation.policy.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      violation.policy.severity === 'info' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ violation.policy.severity }}
                  </span>
                  <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {{ violation.policy.ruleType }}
                  </span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-1">
                  {{ violation.policy.name }}
                </h3>
                <p class="text-gray-600 text-sm">
                  {{ violation.policy.description }}
                </p>
              </div>
            </div>

            <!-- Violation Details -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <!-- Team -->
              <div>
                <div class="text-xs text-gray-500 mb-1">Team</div>
                <NuxtLink
                  :to="`/teams/${violation.team}`"
                  class="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {{ violation.team }}
                </NuxtLink>
              </div>

              <!-- Technology -->
              <div>
                <div class="text-xs text-gray-500 mb-1">Technology</div>
                <div class="flex items-center gap-2">
                  <NuxtLink
                    :to="`/technologies/${violation.technology}`"
                    class="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {{ violation.technology }}
                  </NuxtLink>
                  <span
                    v-if="violation.riskLevel"
                    :class="[
                      'px-2 py-0.5 rounded text-xs font-medium',
                      violation.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                      violation.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                      violation.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    ]"
                  >
                    {{ violation.riskLevel }} risk
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ violation.technologyCategory }}
                </div>
              </div>

              <!-- Enforced By -->
              <div>
                <div class="text-xs text-gray-500 mb-1">Enforced By</div>
                <div class="text-sm font-medium text-gray-900">
                  {{ violation.policy.enforcedBy }}
                </div>
              </div>
            </div>

            <!-- Action Required -->
            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex items-start gap-2">
                <div class="text-yellow-500 mt-0.5">⚠️</div>
                <div class="text-sm text-gray-700">
                  <strong>Action Required:</strong> Team <strong>{{ violation.team }}</strong> must either:
                  <ul class="list-disc list-inside mt-1 ml-4 space-y-1">
                    <li>Approve <strong>{{ violation.technology }}</strong> for use (if compliant with policy)</li>
                    <li>Stop using <strong>{{ violation.technology }}</strong> and migrate to an approved alternative</li>
                    <li>Request a policy exception from <strong>{{ violation.policy.enforcedBy }}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PolicyViolation {
  team: string
  technology: string
  technologyCategory: string
  riskLevel: string
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string
  }
}

interface ViolationsResponse {
  success: boolean
  data: PolicyViolation[]
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
  error?: string
}

const { data, pending, error } = await useFetch<ViolationsResponse>('/api/policies/violations')

useHead({
  title: 'Policy Violations - Polaris'
})
</script>
