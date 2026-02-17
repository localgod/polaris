<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading System"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Systems" to="/systems" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="data?.data">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="data.data.name"
          :description="data.data.domain"
          :links="[{ label: 'Back to Systems', to: '/systems', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <UBadge :color="getCriticalityColor(data.data.businessCriticality)" variant="subtle" size="lg">
          {{ data.data.businessCriticality }}
        </UBadge>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Components</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.componentCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Repositories</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.repositoryCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Environment</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.environment || '—' }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Criticality</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.businessCriticality || '—' }}</p>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Domain</span>
              <p class="font-medium">{{ data.data.domain || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Environment</span>
              <p class="font-medium">{{ data.data.environment || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Business Criticality</span>
              <p class="font-medium">
                <UBadge :color="getCriticalityColor(data.data.businessCriticality)" variant="subtle">
                  {{ data.data.businessCriticality || '—' }}
                </UBadge>
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Ownership</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Owner Team</span>
              <p v-if="data.data.ownerTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.ownerTeam)}`" class="hover:underline">
                  {{ data.data.ownerTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-(--ui-text-muted)">No owner assigned</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Actions</h2>
        </template>
        <div class="flex gap-4 flex-wrap">
          <UButton
            label="View Unmapped Components"
            :to="`/systems/${encodeURIComponent(data.data.name)}/unmapped-components`"
            variant="outline"
          />
          <UButton
            label="View All Components"
            :to="`/components?system=${encodeURIComponent(data.data.name)}`"
            variant="outline"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
}

interface SystemResponse {
  success: boolean
  data: System
}

const { data, pending, error } = await useFetch<SystemResponse>(() => `/api/systems/${encodeURIComponent(route.params.name as string)}`)

function getCriticalityColor(criticality: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return colors[criticality?.toLowerCase()] || 'neutral'
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'System - Polaris')
})
</script>
