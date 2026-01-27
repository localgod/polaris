<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>Teams</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Organizational teams and their responsibilities</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading teams...</p>
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
            <p class="text-sm text-muted">Total Teams</p>
            <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ count }}</p>
          </div>
        </UiCard>

        <div class="grid grid-cols-3">
          <UiCard v-for="team in data.data" :key="team.name">
            <template #header>
              <h3>{{ team.name }}</h3>
            </template>
            <div class="space-y" style="--space: 0.5rem;">
              <div v-if="team.email" class="text-sm">
                <span class="text-muted">Email:</span>
                <a :href="`mailto:${team.email}`" style="margin-left: 0.5rem;">{{ team.email }}</a>
              </div>
              <div v-if="team.responsibilityArea" class="text-sm">
                <span class="text-muted">Area:</span>
                <span style="margin-left: 0.5rem;">{{ team.responsibilityArea }}</span>
              </div>
            </div>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Team } from '~~/types/api'

const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams')
const count = useApiCount(data)

useHead({ title: 'Teams - Polaris' })
</script>
