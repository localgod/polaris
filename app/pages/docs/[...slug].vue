<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </NuxtLink>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Sidebar Navigation -->
        <aside class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow p-6 sticky top-8">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Documentation</h2>
            <nav class="space-y-1">
              <NuxtLink
                to="/docs"
                class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                :class="{ 'bg-blue-50 text-blue-700': $route.path === '/docs' }"
              >
                Overview
              </NuxtLink>

              <div class="mt-4">
                <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Features
                </h3>
                <NuxtLink
                  to="/docs/features/time-framework"
                  class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  TIME Framework
                </NuxtLink>
                <NuxtLink
                  to="/docs/features/team-approvals"
                  class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Team Approvals
                </NuxtLink>
              </div>

              <div class="mt-4">
                <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Architecture
                </h3>
                <NuxtLink
                  to="/docs/architecture/graph-model"
                  class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Graph Model
                </NuxtLink>
              </div>

              <div class="mt-4">
                <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  API
                </h3>
                <NuxtLink
                  to="/docs/api/endpoints"
                  class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Endpoints
                </NuxtLink>
              </div>
            </nav>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="lg:col-span-3">
          <article class="bg-white rounded-lg shadow p-8">
            <!-- Loading State -->
            <div v-if="pending" class="text-center py-12">
              <div class="text-6xl mb-4">⏳</div>
              <p class="text-gray-600">Loading documentation...</p>
            </div>
            
            <!-- Content -->
            <div v-else-if="doc" class="prose prose-blue max-w-none">
              <h1>{{ doc.title || 'Documentation' }}</h1>
              <p v-if="doc.description" class="lead">{{ doc.description }}</p>
              <ContentRenderer :value="doc" />
            </div>
            
            <!-- Not Found -->
            <div v-else class="text-center py-12">
              <div class="text-6xl mb-4">📄</div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
              <p class="text-gray-600 mb-4">
                The documentation page you're looking for doesn't exist.
              </p>
              <NuxtLink
                to="/docs"
                class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Documentation
              </NuxtLink>
            </div>
          </article>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

// Remove /docs prefix from route path to match content paths
const contentPath = route.path.replace(/^\/docs/, '') || '/'

// Fetch documentation content based on route
const { data: doc, pending } = await useAsyncData(
  `docs-${route.path}`,
  () => queryCollection('content').where('path', '=', contentPath).first()
)

// Page metadata
useHead({
  title: doc.value?.title ? `${doc.value.title} - Polaris` : 'Documentation - Polaris'
})
</script>

<style>
/* Prose styling for markdown content */
.prose {
  color: #374151;
  max-width: 65ch;
}

.prose h1 {
  color: #111827;
  font-weight: 800;
  font-size: 2.25em;
  margin-top: 0;
  margin-bottom: 0.8888889em;
  line-height: 1.1111111;
}

.prose h2 {
  color: #111827;
  font-weight: 700;
  font-size: 1.5em;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3333333;
}

.prose h3 {
  color: #111827;
  font-weight: 600;
  font-size: 1.25em;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.6;
}

.prose p {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
}

.prose a {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 500;
}

.prose a:hover {
  color: #1d4ed8;
}

.prose code {
  color: #111827;
  font-weight: 600;
  font-size: 0.875em;
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
}

.prose pre {
  color: #e5e7eb;
  background-color: #1f2937;
  overflow-x: auto;
  font-size: 0.875em;
  line-height: 1.7142857;
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
  border-radius: 0.375rem;
  padding: 0.8571429em 1.1428571em;
}

.prose pre code {
  background-color: transparent;
  border-width: 0;
  border-radius: 0;
  padding: 0;
  font-weight: 400;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}

.prose ul {
  list-style-type: disc;
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.prose ol {
  list-style-type: decimal;
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.prose li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose blockquote {
  font-weight: 500;
  font-style: italic;
  color: #111827;
  border-left-width: 0.25rem;
  border-left-color: #e5e7eb;
  quotes: "\201C""\201D""\2018""\2019";
  margin-top: 1.6em;
  margin-bottom: 1.6em;
  padding-left: 1em;
}

.prose table {
  width: 100%;
  table-layout: auto;
  text-align: left;
  margin-top: 2em;
  margin-bottom: 2em;
  font-size: 0.875em;
  line-height: 1.7142857;
}

.prose thead {
  border-bottom-width: 1px;
  border-bottom-color: #d1d5db;
}

.prose thead th {
  color: #111827;
  font-weight: 600;
  vertical-align: bottom;
  padding-right: 0.5714286em;
  padding-bottom: 0.5714286em;
  padding-left: 0.5714286em;
}

.prose tbody tr {
  border-bottom-width: 1px;
  border-bottom-color: #e5e7eb;
}

.prose tbody td {
  vertical-align: baseline;
  padding: 0.5714286em;
}

.prose .lead {
  color: #4b5563;
  font-size: 1.25em;
  line-height: 1.6;
  margin-top: 1.2em;
  margin-bottom: 1.2em;
}
</style>
