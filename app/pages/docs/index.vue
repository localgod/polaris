<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">← Back to Home</NuxtLink>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold mb-4">Documentation</h2>
            <nav class="space-y-2">
              <NuxtLink to="/docs" class="block px-3 py-2 bg-blue-50 text-blue-700 rounded">Overview</NuxtLink>
              <NuxtLink to="/docs/features/time-framework" class="block px-3 py-2 hover:bg-gray-100 rounded">TIME Framework</NuxtLink>
              <NuxtLink to="/docs/features/team-approvals" class="block px-3 py-2 hover:bg-gray-100 rounded">Team Approvals</NuxtLink>
              <NuxtLink to="/docs/architecture/graph-model" class="block px-3 py-2 hover:bg-gray-100 rounded">Graph Model</NuxtLink>
              <NuxtLink to="/docs/api/endpoints" class="block px-3 py-2 hover:bg-gray-100 rounded">API Endpoints</NuxtLink>
            </nav>
          </div>
        </aside>

        <main class="lg:col-span-3">
          <div class="bg-white rounded-lg shadow p-8">
            <h1 class="text-4xl font-bold mb-4">Polaris Documentation</h1>
            <p class="text-xl text-gray-600 mb-8">Enterprise Technology Catalog</p>
            <p class="mb-4">Select a topic from the sidebar to get started.</p>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Documentation - Polaris' })
</script>
