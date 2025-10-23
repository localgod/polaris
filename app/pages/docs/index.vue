<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <UiCard>
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Documentation</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Enterprise Technology Catalog</p>
        </div>

        <div class="mt-6 prose dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-300">
            Polaris is an enterprise technology catalog that helps organizations manage their technology landscape.
            It provides visibility into systems, components, technologies, and their relationships.
          </p>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Key Features</h3>
          <ul class="space-y-2 text-gray-600 dark:text-gray-300">
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Technology lifecycle management with the TIME framework</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Team-based approval workflows for technology adoption</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Policy compliance tracking and violation detection</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Graph-based relationship tracking between systems and technologies</span>
            </li>
          </ul>
          
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Getting Started</h3>
          <p class="text-gray-600 dark:text-gray-300">
            Use the navigation tree on the left to explore different sections of the documentation. 
            Start with the <strong>Features</strong> section to understand core concepts, or jump to 
            <strong>Architecture</strong> to learn about the technical implementation.
          </p>
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({ title: 'Documentation - Polaris' })
</script>
