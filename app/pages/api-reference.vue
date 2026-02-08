<template>
  
    <div class="space-y">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1>API Reference</h1>
          <p>
            {{ spec?.info?.title || 'Polaris REST API' }} v{{ spec?.info?.version || '2.0.0' }}
          </p>
        </div>
        <a href="/api/openapi.json" download class="btn btn-secondary">
          Download OpenAPI Spec
        </a>
      </div>

      <!-- Loading -->
      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;" />
          <p class="text-muted" style="margin-top: 1rem;">Loading API specification...</p>
        </div>
      </UiCard>

      <!-- Error -->
      <UiCard v-else-if="error">
        <div class="alert alert-error">
          Failed to load API specification: {{ error.message }}
        </div>
      </UiCard>

      <template v-else-if="spec">
        <!-- Overview -->
        <UiCard>
          <template #header>
            <h2>Overview</h2>
          </template>
          <div class="prose" v-html="renderMarkdown(spec.info?.description || '')" />
        </UiCard>

        <!-- Endpoints by Tag -->
        <UiCard v-for="tag in spec.tags" :key="tag.name">
          <template #header>
            <h2>{{ tag.name }}</h2>
            <p class="text-muted text-sm">{{ tag.description }}</p>
          </template>
          <div class="space-y" style="--space: 1rem;">
            <div
              v-for="endpoint in getEndpointsByTag(tag.name)"
              :key="`${endpoint.method}-${endpoint.path}`"
              style="border: 1px solid var(--color-border); border-radius: 0.5rem; overflow: hidden;"
            >
              <div
                style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 1rem;"
                :style="{ background: getMethodColor(endpoint.method) }"
              >
                <span
                  style="font-weight: 700; font-size: 0.75rem; text-transform: uppercase; min-width: 4rem;"
                  :style="{ color: getMethodTextColor(endpoint.method) }"
                >
                  {{ endpoint.method }}
                </span>
                <code style="flex: 1; font-size: 0.875rem;">{{ endpoint.path }}</code>
                <span v-if="endpoint.security" class="badge badge-warning" style="font-size: 0.7rem;">Auth Required</span>
              </div>
              <div style="padding: 0.75rem 1rem; background: var(--ui-bg-muted, #f9fafb);">
                <p class="text-sm">{{ endpoint.summary || endpoint.description }}</p>
                <div v-if="endpoint.parameters && endpoint.parameters.length > 0" style="margin-top: 0.75rem;">
                  <p class="text-sm font-medium text-muted">Parameters:</p>
                  <div style="margin-top: 0.25rem;">
                    <span
                      v-for="param in endpoint.parameters"
                      :key="param.name"
                      class="badge"
                      :class="param.required ? 'badge-primary' : 'badge-neutral'"
                      style="margin-right: 0.25rem; margin-bottom: 0.25rem;"
                    >
                      {{ param.name }}{{ param.required ? '*' : '' }}
                    </span>
                  </div>
                </div>
                <div v-if="endpoint.requestBody" style="margin-top: 0.5rem;">
                  <span class="badge badge-primary" style="font-size: 0.7rem;">Request Body Required</span>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Schemas -->
        <UiCard v-if="schemaList.length > 0">
          <template #header>
            <h2>Data Schemas</h2>
            <p class="text-muted text-sm">Common data structures used in API responses</p>
          </template>
          <div class="grid grid-cols-3">
            <div
              v-for="schema in schemaList"
              :key="schema.name"
              style="border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem;"
            >
              <h3 class="font-semibold">{{ schema.name }}</h3>
              <p v-if="schema.description" class="text-sm text-muted" style="margin-top: 0.25rem;">{{ schema.description }}</p>
              <div style="margin-top: 0.5rem;">
                <span
                  v-for="field in schema.fields.slice(0, 5)"
                  :key="field"
                  class="badge badge-neutral"
                  style="margin-right: 0.25rem; margin-bottom: 0.25rem; font-size: 0.7rem;"
                >
                  {{ field }}
                </span>
                <span v-if="schema.fields.length > 5" class="text-muted text-sm">+{{ schema.fields.length - 5 }} more</span>
              </div>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  
</template>

<script setup lang="ts">
interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  tags?: Array<{ name: string; description?: string }>
  paths: Record<string, Record<string, PathOperation>>
  components?: {
    schemas?: Record<string, SchemaDefinition>
  }
}

interface PathOperation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Array<{ name: string; in: string; required?: boolean }>
  requestBody?: object
  security?: Array<Record<string, string[]>>
  responses: Record<string, object>
}

interface SchemaDefinition {
  type?: string
  description?: string
  properties?: Record<string, object>
  required?: string[]
}

interface Endpoint {
  method: string
  path: string
  summary?: string
  description?: string
  tags: string[]
  parameters?: Array<{ name: string; in: string; required?: boolean }>
  requestBody?: object
  security?: Array<Record<string, string[]>>
}

interface Schema {
  name: string
  description?: string
  fields: string[]
}

const { data: spec, pending, error } = await useFetch<OpenAPISpec>('/api/openapi.json')

const endpoints = computed<Endpoint[]>(() => {
  if (!spec.value?.paths) return []
  
  const result: Endpoint[] = []
  for (const [path, methods] of Object.entries(spec.value.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        result.push({
          method: method.toUpperCase(),
          path: `/api${path}`,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags || ['Other'],
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          security: operation.security
        })
      }
    }
  }
  return result
})

const schemaList = computed<Schema[]>(() => {
  if (!spec.value?.components?.schemas) return []
  
  const excludeSchemas = ['ApiSuccessResponse', 'ApiSingleResourceResponse', 'ApiErrorResponse']
  
  return Object.entries(spec.value.components.schemas)
    .filter(([name]) => !excludeSchemas.includes(name))
    .map(([name, schema]) => ({
      name,
      description: schema.description,
      fields: schema.properties ? Object.keys(schema.properties) : []
    }))
})

function getEndpointsByTag(tagName: string): Endpoint[] {
  return endpoints.value.filter(e => e.tags.includes(tagName))
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'rgba(34, 197, 94, 0.12)',
    POST: 'rgba(59, 130, 246, 0.12)',
    PUT: 'rgba(245, 158, 11, 0.12)',
    PATCH: 'rgba(245, 158, 11, 0.12)',
    DELETE: 'rgba(239, 68, 68, 0.12)'
  }
  return colors[method] || 'var(--ui-bg-muted, #f3f4f6)'
}

function getMethodTextColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'var(--color-success)',
    POST: 'var(--color-primary)',
    PUT: 'var(--color-warning)',
    PATCH: 'var(--color-warning)',
    DELETE: 'var(--color-error)'
  }
  return colors[method] || 'var(--color-text)'
}

function renderMarkdown(text: string): string {
  // Simple markdown rendering for the description
  return text
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h5>$1</h5>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match
      return `<p>${match}</p>`
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1')
}

useHead({
  title: 'API Reference - Polaris'
})
</script>

<style scoped>
.prose h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.prose h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.prose ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.prose li {
  margin: 0.25rem 0;
}

.prose p {
  margin: 0.5rem 0;
}

.prose pre {
  background: #1e293b;
  color: #f1f5f9;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.75rem 0;
  font-size: 0.875rem;
  border: 1px solid #334155;
}

.prose pre code {
  color: #f1f5f9;
  background: transparent;
}

.prose code {
  font-family: ui-monospace, monospace;
  background: var(--ui-bg-elevated, #f3f4f6);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose strong {
  font-weight: 600;
}
</style>
