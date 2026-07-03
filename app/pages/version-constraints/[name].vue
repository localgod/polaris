<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Version Constraint"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Version Constraints" to="/version-constraints" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="data?.data">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="data.data.name"
          :description="data.data.description"
          :links="[{ label: 'Back to Version Constraints', to: '/version-constraints', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
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

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Details</h2>
        </template>
        <EntityDescriptionList :items="detailsItems">
          <template #versionRange="{ item }">
            <p class="font-medium mt-0.5"><code>{{ item.value }}</code></p>
          </template>
          <template #severity="{ item }">
            <p class="font-medium mt-0.5">
              <UBadge :color="getSeverityColor(String(item.value))" variant="subtle">
                {{ item.value }}
              </UBadge>
            </p>
          </template>
        </EntityDescriptionList>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface VersionConstraint {
  name: string
  description: string
  severity: string
  scope: string
  subjectTeam: string | null
  versionRange: string | null
  status: string
  subjectTeams: string[]
  governedTechnologies: string[]
}

interface Response {
  success: boolean
  data: VersionConstraint
}

const { data, pending, error } = await useFetch<Response>(() => `/api/version-constraints/${encodeURIComponent(route.params.name as string)}`)

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success', draft: 'warning', inactive: 'neutral', archived: 'neutral'
  }
  return colors[status?.toLowerCase()] || 'neutral'
}

const detailsItems = computed(() => {
  const vc = data.value?.data
  if (!vc) return []
  return [
    { key: 'scope', label: 'Scope', value: vc.subjectTeam ? `${vc.scope} — ${vc.subjectTeam}` : vc.scope },
    ...(vc.versionRange ? [{ key: 'versionRange', label: 'Version Range', value: vc.versionRange }] : []),
    { key: 'severity', label: 'Severity', value: vc.severity },
    { key: 'status', label: 'Status', value: vc.status },
    ...(vc.subjectTeams?.length
      ? [{
          key: 'subjectTeams',
          label: `Subject Teams (${vc.subjectTeams.length})`,
          tags: vc.subjectTeams.map(team => ({ label: team, to: `/teams/${encodeURIComponent(team)}` })),
          span: 2 as const
        }]
      : []),
    ...(vc.governedTechnologies?.length
      ? [{
          key: 'governedTechnologies',
          label: `Governed Technologies (${vc.governedTechnologies.length})`,
          tags: vc.governedTechnologies.map(tech => ({ label: tech, to: `/technologies/${encodeURIComponent(tech)}` })),
          span: 2 as const
        }]
      : [])
  ]
})

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Version Constraint - Polaris')
})
</script>
