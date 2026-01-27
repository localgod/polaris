<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div>
        <h1>Technologies</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Approved technologies and their versions</p>
      </div>

      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading technologies...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <UiCard v-else-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error Loading Technologies</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Content -->
      <template v-else-if="data?.data">
        <!-- Summary -->
        <div class="grid grid-cols-3">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Technologies</p>
              <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Categories</p>
              <p class="text-3xl font-bold text-primary" style="margin-top: 0.5rem;">{{ uniqueCategories.length }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Vendors</p>
              <p class="text-3xl font-bold text-success" style="margin-top: 0.5rem;">{{ uniqueVendors.length }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Technologies Grid -->
        <div class="grid grid-cols-3">
          <UiCard v-for="tech in data.data" :key="tech.name">
            <template #header>
              <div>
                <h3>{{ tech.name }}</h3>
                <p v-if="tech.vendor" class="text-sm text-muted">{{ tech.vendor }}</p>
              </div>
            </template>

            <div class="space-y" style="--space: 0.75rem;">
              <div v-if="tech.category" class="flex justify-between text-sm">
                <span class="text-muted">Category</span>
                <UiBadge variant="neutral">{{ tech.category }}</UiBadge>
              </div>
              
              <div v-if="tech.approvedVersionRange" class="flex justify-between text-sm">
                <span class="text-muted">Version Range</span>
                <code>{{ tech.approvedVersionRange }}</code>
              </div>
              
              <div v-if="tech.ownerTeam" class="flex justify-between text-sm">
                <span class="text-muted">Owner</span>
                <span class="font-medium">{{ tech.ownerTeam }}</span>
              </div>
            </div>

            <template #footer>
              <NuxtLink :to="`/technologies/${encodeURIComponent(tech.name)}`">
                View Details →
              </NuxtLink>
            </template>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Technology } from '~~/types/api'

const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies')
const count = useApiCount(data)

const uniqueCategories = computed(() => {
  if (!data.value?.data) return []
  return [...new Set(data.value.data.map((t: Technology) => t.category).filter(Boolean))]
})

const uniqueVendors = computed(() => {
  if (!data.value?.data) return []
  return [...new Set(data.value.data.map((t: Technology) => t.vendor).filter(Boolean))]
})

useHead({
  title: 'Technologies - Polaris'
})
</script>
