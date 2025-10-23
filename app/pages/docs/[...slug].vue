<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <UiCard>
          <!-- Loading State -->
          <div v-if="pending" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
            <p class="mt-4 text-gray-600 dark:text-gray-300">Loading documentation...</p>
          </div>
          
          <!-- Content -->
          <div v-else-if="doc" class="prose dark:prose-invert max-w-none">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ doc.title || 'Documentation' }}</h1>
            <p v-if="doc.description" class="text-lg text-gray-600 dark:text-gray-300 mt-2">{{ doc.description }}</p>
            <ContentRenderer :value="doc" class="mt-6" />
          </div>
          
          <!-- Not Found -->
          <div v-else class="text-center py-12">
            <svg class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Page Not Found</h2>
            <p class="mt-2 text-gray-600 dark:text-gray-300">
              The documentation page you're looking for doesn't exist.
            </p>
            <NuxtLink
              to="/docs"
              class="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Documentation
            </NuxtLink>
          </div>
      </UiCard>
    </div>
  </NuxtLayout>
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

.dark .prose {
  color: #d1d5db;
}

.prose h1 {
  color: #111827;
  font-weight: 800;
  font-size: 2.25em;
  margin-top: 0;
  margin-bottom: 0.8888889em;
  line-height: 1.1111111;
}

.dark .prose h1 {
  color: #f9fafb;
}

.prose h2 {
  color: #111827;
  font-weight: 700;
  font-size: 1.5em;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3333333;
}

.dark .prose h2 {
  color: #f3f4f6;
}

.prose h3 {
  color: #111827;
  font-weight: 600;
  font-size: 1.25em;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.6;
}

.dark .prose h3 {
  color: #e5e7eb;
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

.dark .prose a {
  color: #60a5fa;
}

.prose a:hover {
  color: #1d4ed8;
}

.dark .prose a:hover {
  color: #93c5fd;
}

.prose code {
  color: #111827;
  font-weight: 600;
  font-size: 0.875em;
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
}

.dark .prose code {
  color: #e5e7eb;
  background-color: #374151;
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

.dark .prose blockquote {
  color: #d1d5db;
  border-left-color: #4b5563;
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

.dark .prose thead {
  border-bottom-color: #4b5563;
}

.prose thead th {
  color: #111827;
  font-weight: 600;
  vertical-align: bottom;
  padding-right: 0.5714286em;
  padding-bottom: 0.5714286em;
  padding-left: 0.5714286em;
}

.dark .prose thead th {
  color: #f3f4f6;
}

.prose tbody tr {
  border-bottom-width: 1px;
  border-bottom-color: #e5e7eb;
}

.dark .prose tbody tr {
  border-bottom-color: #374151;
}

.prose tbody td {
  vertical-align: baseline;
  padding: 0.5714286em;
}

.dark .prose tbody td {
  color: #d1d5db;
}

.prose .lead {
  color: #4b5563;
  font-size: 1.25em;
  line-height: 1.6;
  margin-top: 1.2em;
  margin-bottom: 1.2em;
}

.dark .prose .lead {
  color: #9ca3af;
}
</style>
