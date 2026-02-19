<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Policy"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Policies" to="/policies" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="data?.data">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="data.data.name"
          :description="data.data.description"
          :links="[{ label: 'Back to Policies', to: '/policies', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex gap-2">
          <UBadge :color="getStatusColor(data.data.status)" variant="subtle">
            {{ data.data.status }}
          </UBadge>
          <UBadge :color="getSeverityColor(data.data.severity)" variant="subtle">
            {{ data.data.severity }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Rule Type</span>
              <p class="font-medium">{{ data.data.ruleType }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Scope</span>
              <p class="font-medium">
                {{ data.data.scope }}
                <span v-if="data.data.subjectTeam"> — {{ data.data.subjectTeam }}</span>
              </p>
            </div>
            <div v-if="data.data.versionRange">
              <span class="text-sm text-(--ui-text-muted)">Version Range</span>
              <p class="font-medium"><code>{{ data.data.versionRange }}</code></p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Severity</span>
              <p class="font-medium">
                <UBadge :color="getSeverityColor(data.data.severity)" variant="subtle">
                  {{ data.data.severity }}
                </UBadge>
              </p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Effective Date</span>
              <p class="font-medium">{{ formatDate(data.data.effectiveDate) }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Enforcement</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Enforced By</span>
              <p v-if="data.data.enforcerTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.enforcerTeam)}`">
                  {{ data.data.enforcerTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-(--ui-text-muted)">—</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Status</span>
              <p class="font-medium">{{ data.data.status }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-if="data.data.subjectTeams && data.data.subjectTeams.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Subject Teams ({{ data.data.subjectTeams.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="team in data.data.subjectTeams"
            :key="team"
            :label="team"
            :to="`/teams/${encodeURIComponent(team)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          />
        </div>
      </UCard>

      <template v-if="data.data.ruleType === 'license-compliance'">
        <UCard v-if="data.data.deniedLicenses && data.data.deniedLicenses.length > 0">
          <template #header>
            <h2 class="text-lg font-semibold">Denied Licenses ({{ data.data.deniedLicenses.length }})</h2>
          </template>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="license in data.data.deniedLicenses"
              :key="license"
              color="error"
              variant="subtle"
            >
              {{ license }}
            </UBadge>
          </div>
        </UCard>

        <UCard v-if="data.data.allowedLicenses && data.data.allowedLicenses.length > 0">
          <template #header>
            <h2 class="text-lg font-semibold">Allowed Licenses ({{ data.data.allowedLicenses.length }})</h2>
          </template>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="license in data.data.allowedLicenses"
              :key="license"
              color="success"
              variant="subtle"
            >
              {{ license }}
            </UBadge>
          </div>
        </UCard>
      </template>

      <UCard v-if="data.data.governedTechnologies && data.data.governedTechnologies.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Governed Technologies ({{ data.data.governedTechnologies.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tech in data.data.governedTechnologies"
            :key="tech"
            :label="tech"
            :to="`/technologies/${encodeURIComponent(tech)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface Policy {
  name: string
  description: string
  ruleType: string
  severity: string
  effectiveDate: string
  enforcedBy: string
  scope: string
  subjectTeam: string | null
  versionRange: string | null
  status: string
  licenseMode?: string
  enforcerTeam: string | null
  subjectTeams: string[]
  governedTechnologies: string[]
  governedVersions: string[]
  allowedLicenses?: string[]
  deniedLicenses?: string[]
}

interface PolicyResponse {
  success: boolean
  data: Policy
}

const { data, pending, error } = await useFetch<PolicyResponse>(() => `/api/policies/${encodeURIComponent(route.params.name as string)}`)

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    draft: 'warning',
    inactive: 'neutral',
    archived: 'neutral'
  }
  return colors[status?.toLowerCase()] || 'neutral'
}

function getSeverityColor(severity: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity?.toLowerCase()] || 'neutral'
}

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Policy - Polaris')
})
</script>
