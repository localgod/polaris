<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <NuxtLink to="/docs" style="display: inline-block; margin-bottom: 1rem;">← Back to Documentation</NuxtLink>
      
      <UiCard>
        <!-- Loading State -->
        <div v-if="pending" class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;" />
          <p class="text-muted" style="margin-top: 1rem;">Loading documentation...</p>
        </div>
        
        <!-- Content -->
        <div v-else-if="doc" class="prose">
          <h1>{{ doc.title || 'Documentation' }}</h1>
          <p v-if="doc.description" class="text-muted text-lg" style="margin-top: 0.5rem;">{{ doc.description }}</p>
          <ContentRenderer :value="doc" style="margin-top: 1.5rem;" />
        </div>
        
        <!-- Not Found -->
        <div v-else class="text-center" style="padding: 3rem;">
          <svg style="margin: 0 auto; width: 4rem; height: 4rem; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 style="margin-top: 1rem;">Page Not Found</h2>
          <p class="text-muted" style="margin-top: 0.5rem;">
            The documentation page you're looking for doesn't exist.
          </p>
          <NuxtLink to="/docs" class="btn btn-primary" style="margin-top: 1.5rem;">
            ← Back to Documentation
          </NuxtLink>
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()

// Get the slug from route params
const slug = route.params.slug as string[] || []

// Build content path from slug
// URL: /docs/features/time-framework -> slug: ['features', 'time-framework']
// Content paths are stored with leading slash: /features/time-framework
const contentPath = slug.length > 0 ? `/${slug.join('/')}` : '/index'

// Fetch documentation content using queryCollection (Nuxt Content v3 API)
const { data: doc, pending } = await useAsyncData(
  `docs-${contentPath}`,
  () => queryCollection('content').path(contentPath).first()
)

// Page metadata
useHead({
  title: doc.value?.title ? `${doc.value.title} - Polaris` : 'Documentation - Polaris'
})
</script>

<style>
.prose {
  max-width: 65ch;
  line-height: 1.75;
  color: #374151;
}

.prose h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #111827;
}

.prose h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #111827;
}

.prose h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #111827;
}

.prose p {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
}

.prose ul, .prose ol {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.prose ul {
  list-style-type: disc;
}

.prose ol {
  list-style-type: decimal;
}

.prose li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose code {
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-weight: 600;
}

.prose pre {
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  font-size: 0.875em;
  line-height: 1.7;
}

.prose pre code {
  background: transparent;
  padding: 0;
  font-weight: 400;
}

.prose a {
  color: var(--color-primary);
  text-decoration: underline;
}

.prose blockquote {
  border-left: 4px solid var(--color-border);
  padding-left: 1rem;
  margin: 1.5em 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.prose table {
  width: 100%;
  table-layout: auto;
  text-align: left;
  margin-top: 2em;
  margin-bottom: 2em;
  font-size: 0.875em;
}

.prose thead {
  border-bottom: 1px solid #d1d5db;
}

.prose thead th {
  font-weight: 600;
  padding: 0.5em;
  vertical-align: bottom;
}

.prose tbody tr {
  border-bottom: 1px solid #e5e7eb;
}

.prose tbody td {
  padding: 0.5em;
  vertical-align: baseline;
}
</style>
