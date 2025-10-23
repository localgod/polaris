<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-16">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-6xl font-bold text-gray-900 mb-4">
          Polaris
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Enterprise Technology Catalog
        </p>
      </div>

      <!-- Database Status -->
      <div class="max-w-2xl mx-auto mb-8">
        <div v-if="dbStatus" class="rounded-lg shadow-lg p-6" :class="dbStatus.status === 'online' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'">
          <div class="flex items-center gap-3">
            <div class="text-3xl">
              {{ dbStatus.status === 'online' ? '✓' : '✗' }}
            </div>
            <div>
              <h3 class="text-lg font-semibold" :class="dbStatus.status === 'online' ? 'text-green-900' : 'text-red-900'">
                Database {{ dbStatus.status === 'online' ? 'Online' : 'Offline' }}
              </h3>
              <p class="text-sm" :class="dbStatus.status === 'online' ? 'text-green-700' : 'text-red-700'">
                {{ dbStatus.message }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="bg-gray-50 rounded-lg shadow-lg p-6 border-l-4 border-gray-400">
          <div class="flex items-center gap-3">
            <div class="text-3xl">⏳</div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Checking Database Status...</h3>
              <p class="text-sm text-gray-600">Please wait</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Welcome Message -->
      <div class="max-w-2xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Welcome</h2>
          <p class="text-gray-600 mb-4">
            This is a Nuxt 4 application running in a development environment. 
            Neo4j is available as a separate service for data persistence.
          </p>
          <p class="text-sm text-gray-500">
            The application is decoupled from Neo4j - schema management and database 
            operations are handled independently via CLI tools.
          </p>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Technologies Catalog -->
        <NuxtLink 
          to="/technologies"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            🔧
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Technologies
          </h2>
          <p class="text-gray-600 mb-4">
            Browse approved technologies, versions, and compliance status
          </p>
          <div class="text-blue-600 font-semibold">
            View Technologies →
          </div>
        </NuxtLink>

        <!-- Systems -->
        <NuxtLink 
          to="/systems"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            🖥️
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Systems
          </h2>
          <p class="text-gray-600 mb-4">
            View deployable applications and their dependencies
          </p>
          <div class="text-blue-600 font-semibold">
            View Systems →
          </div>
        </NuxtLink>

        <!-- Teams -->
        <NuxtLink 
          to="/teams"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            👥
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Teams
          </h2>
          <p class="text-gray-600 mb-4">
            Explore organizational teams and their responsibilities
          </p>
          <div class="text-blue-600 font-semibold">
            View Teams →
          </div>
        </NuxtLink>

        <!-- Policies -->
        <NuxtLink 
          to="/policies"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            📋
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Policies
          </h2>
          <p class="text-gray-600 mb-4">
            Review governance and compliance rules
          </p>
          <div class="text-blue-600 font-semibold">
            View Policies →
          </div>
        </NuxtLink>

        <!-- Policy Violations -->
        <NuxtLink 
          to="/violations"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group border-l-4 border-orange-500"
        >
          <div class="text-5xl mb-4">
            ⚠️
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
            Policy Violations
          </h2>
          <p class="text-gray-600 mb-4">
            View technologies used without approval
          </p>
          <div class="text-orange-600 font-semibold">
            View Violations →
          </div>
        </NuxtLink>

        <!-- Components -->
        <NuxtLink 
          to="/components"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            📦
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Components
          </h2>
          <p class="text-gray-600 mb-4">
            Browse SBOM entries and dependency information
          </p>
          <div class="text-blue-600 font-semibold">
            View Components →
          </div>
        </NuxtLink>

        <!-- Documentation -->
        <NuxtLink 
          to="/docs"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">
            📚
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Documentation
          </h2>
          <p class="text-gray-600 mb-4">
            Learn about features, architecture, and API usage
          </p>
          <div class="text-blue-600 font-semibold">
            View Documentation →
          </div>
        </NuxtLink>

      </div>

      <!-- Footer -->
      <div class="text-center mt-16 text-gray-600">
        <p class="text-sm">
          Built with Nuxt 4, Vue 3, and TypeScript
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Fetch database status
const { data: dbStatus } = await useFetch('/api/db-status')

useHead({
  title: 'Polaris - Nuxt 4'
})
</script>
