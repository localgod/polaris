<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1>API Reference</h1>
        <p class="text-(--ui-text-muted)">{{ spec?.info?.title }} — v{{ spec?.info?.version }}</p>
      </div>
      <UButton
        v-if="spec"
        label="Download OpenAPI Spec"
        icon="i-lucide-download"
        variant="outline"
        @click="downloadSpec"
      />
    </div>

    <USkeleton v-if="loading" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Failed to load API specification"
      :description="error?.message || 'Unknown error'"
    />

    <template v-else-if="spec">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Overview</h2>
        </template>
        <div class="prose-content" v-html="renderMarkdown(spec.info?.description || '')" />
      </UCard>

      <UCard v-for="tag in spec.tags" :key="tag.name">
        <template #header>
          <div>
            <h2 class="text-lg font-semibold">{{ tag.name }}</h2>
            <p class="text-sm text-(--ui-text-muted)">{{ tag.description }}</p>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="endpoint in getEndpointsByTag(tag.name)" :key="endpoint.path + endpoint.method">
            <div
              class="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-(--ui-bg-elevated) transition-colors"
              @click="toggleEndpoint(endpoint.path + endpoint.method)"
            >
              <UBadge
                :color="getMethodColor(endpoint.method)"
                variant="subtle"
                class="font-mono text-xs w-16 justify-center"
              >
                {{ endpoint.method }}
              </UBadge>
              <code class="text-sm font-mono">{{ endpoint.path }}</code>
              <span class="text-sm text-(--ui-text-muted) ml-auto">{{ endpoint.summary }}</span>
              <UBadge v-if="endpoint.security" color="warning" variant="subtle" size="xs">
                Auth Required
              </UBadge>
            </div>

            <div v-if="expandedEndpoints.has(endpoint.path + endpoint.method)" class="mt-2 ml-2 space-y-3">
              <div v-if="endpoint.description" class="text-sm text-(--ui-text-muted) px-3">
                {{ endpoint.description }}
              </div>

              <div v-if="endpoint.parameters?.length" class="px-3">
                <h4 class="text-sm font-semibold mb-2">Parameters</h4>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="param in endpoint.parameters"
                    :key="param.name"
                    :color="param.required ? 'primary' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ param.name }} ({{ param.in }})
                  </UBadge>
                </div>
              </div>

              <div v-if="endpoint.requestBody" class="px-3">
                <h4 class="text-sm font-semibold mb-2">
                  Request Body
                  <UBadge color="primary" variant="subtle" size="xs" class="ml-2">Required</UBadge>
                </h4>
              </div>

              <div v-if="endpoint.responses" class="px-3">
                <h4 class="text-sm font-semibold mb-2">Responses</h4>
                <div class="space-y-2">
                  <div v-for="(response, code) in endpoint.responses" :key="code" class="flex items-start gap-2">
                    <UBadge
                      :color="getStatusColor(String(code))"
                      variant="subtle"
                      size="sm"
                      class="font-mono"
                    >
                      {{ code }}
                    </UBadge>
                    <span class="text-sm text-(--ui-text-muted)">{{ response.description }}</span>
                  </div>
                </div>
              </div>

              <div v-if="getResponseSchema(endpoint)" class="px-3">
                <h4 class="text-sm font-semibold mb-2">Response Schema</h4>
                <UCard variant="subtle">
                  <pre class="text-xs font-mono overflow-x-auto">{{ JSON.stringify(getResponseSchema(endpoint), null, 2) }}</pre>
                </UCard>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({
  title: 'API Reference - Polaris'
})

interface OpenAPISpec {
  info: { title: string; version: string; description?: string }
  tags?: Array<{ name: string; description?: string }>
  paths: Record<string, Record<string, EndpointDetail>>
}

interface EndpointDetail {
  summary?: string
  description?: string
  tags?: string[]
  parameters?: Array<{ name: string; in: string; required?: boolean }>
  requestBody?: unknown
  responses?: Record<string, { description: string; content?: unknown }>
  security?: unknown[]
}

interface Endpoint extends EndpointDetail {
  path: string
  method: string
}

const expandedEndpoints = ref(new Set<string>())

const { data: spec, status, error } = await useFetch<OpenAPISpec>('/api/openapi.json')
const loading = computed(() => status.value === 'pending')

function getMethodColor(method: string): 'success' | 'primary' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'neutral'> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'error'
  }
  return colors[method] || 'neutral'
}

function getStatusColor(code: string): 'success' | 'primary' | 'warning' | 'error' | 'neutral' {
  if (code.startsWith('2')) return 'success'
  if (code.startsWith('3')) return 'primary'
  if (code.startsWith('4')) return 'warning'
  if (code.startsWith('5')) return 'error'
  return 'neutral'
}

function toggleEndpoint(key: string) {
  if (expandedEndpoints.value.has(key)) {
    expandedEndpoints.value.delete(key)
  }
  else {
    expandedEndpoints.value.add(key)
  }
}

function getEndpointsByTag(tagName: string): Endpoint[] {
  if (!spec.value) return []
  const endpoints: Endpoint[] = []
  for (const [path, methods] of Object.entries(spec.value.paths)) {
    for (const [method, detail] of Object.entries(methods)) {
      if (detail.tags?.includes(tagName)) {
        endpoints.push({ ...detail, path, method: method.toUpperCase() })
      }
    }
  }
  return endpoints
}

function getResponseSchema(endpoint: Endpoint): unknown | null {
  const successResponse = endpoint.responses?.['200'] || endpoint.responses?.['201']
  if (!successResponse?.content) return null
  const jsonContent = (successResponse.content as Record<string, { schema?: unknown }>)['application/json']
  return jsonContent?.schema || null
}

function renderMarkdown(text: string): string {
  return text
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n- (.*)/g, '<li>$1</li>')
}

function downloadSpec() {
  const blob = new Blob([JSON.stringify(spec.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'openapi-spec.json'
  a.click()
  URL.revokeObjectURL(url)
}


</script>

<style scoped>
.prose-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.prose-content :deep(p) {
  margin: 0.5rem 0;
  color: var(--ui-text-muted);
}

.prose-content :deep(ul) {
  list-style: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.prose-content :deep(li) {
  margin: 0.25rem 0;
}

.prose-content :deep(code) {
  font-family: ui-monospace, monospace;
  background: var(--ui-bg-elevated);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose-content :deep(strong) {
  font-weight: 600;
}
</style>
