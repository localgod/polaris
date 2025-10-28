<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Organizational teams and their responsibilities</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading teams...</p>
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

      <template v-else-if="data">
        <UiCard>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Teams</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ count }}</p>
          </div>
        </UiCard>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UiCard v-for="team in data.data" :key="team.name">
            <template #header>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ team.name }}</h3>
            </template>
            <div class="space-y-2">
              <div v-if="team.email" class="text-sm">
                <span class="text-gray-600 dark:text-gray-300">Email:</span>
                <a :href="`mailto:${team.email}`" class="ml-2 text-primary-600 dark:text-primary-400 hover:underline">{{ team.email }}</a>
              </div>
              <div v-if="team.responsibilityArea" class="text-sm">
                <span class="text-gray-600 dark:text-gray-300">Area:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ team.responsibilityArea }}</span>
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
