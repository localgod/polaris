<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-16">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-6xl font-bold text-gray-900 mb-4">
          Polaris
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Nuxt 4 Application
        </p>
        <div class="flex items-center justify-center gap-4">
          <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            ✓ Nuxt 4.1.3
          </span>
          <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
            ✓ TypeScript
          </span>
          <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            ✓ Vue 3
          </span>
        </div>
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
      <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Documentation -->
        <a 
          href="https://nuxt.com/docs"
          target="_blank"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">📚</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Nuxt Documentation
          </h2>
          <p class="text-gray-600 mb-4">
            Learn about Nuxt 4 features, API, and best practices
          </p>
          <div class="text-blue-600 font-semibold">
            Read Docs →
          </div>
        </a>

        <!-- Vue Guide -->
        <a 
          href="https://vuejs.org/guide/introduction.html"
          target="_blank"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">💚</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
            Vue.js Guide
          </h2>
          <p class="text-gray-600 mb-4">
            Explore Vue 3 composition API and component patterns
          </p>
          <div class="text-green-600 font-semibold">
            Learn Vue →
          </div>
        </a>

        <!-- GitHub Repository -->
        <a 
          href="https://github.com/localgod/polaris"
          target="_blank"
          class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
        >
          <div class="text-5xl mb-4">🐙</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
            GitHub Repository
          </h2>
          <p class="text-gray-600 mb-4">
            View source code, issues, and project documentation
          </p>
          <div class="text-purple-600 font-semibold">
            View on GitHub →
          </div>
        </a>

        <!-- Dev Tools -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-5xl mb-4">🛠️</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Development Tools
          </h2>
          <p class="text-gray-600 mb-4">
            Available development utilities
          </p>
          <div class="space-y-2 text-sm">
            <div class="text-gray-700">
              <code class="bg-gray-100 px-2 py-1 rounded">npm run dev</code> - Start dev server
            </div>
            <div class="text-gray-700">
              <code class="bg-gray-100 px-2 py-1 rounded">npm run build</code> - Build for production
            </div>
            <div class="text-gray-700">
              <code class="bg-gray-100 px-2 py-1 rounded">npm run migrate:*</code> - Database migrations
            </div>
          </div>
        </div>
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
