<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <UPageHeader
      title="Create New Technology"
      description="Add a new technology to the catalog"
      :links="[{ label: 'Back to Technologies', to: '/technologies', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UCard>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UFormField label="Technology Name" required>
          <UInput
            v-model="formData.name"
            placeholder="e.g., React"
            :color="fieldErrors.name ? 'error' : undefined"
            @blur="validateField('name')"
          />
          <template v-if="fieldErrors.name" #help>
            <span class="text-(--ui-color-error-500)">{{ fieldErrors.name }}</span>
          </template>
        </UFormField>

        <UFormField label="Category" required>
          <USelect
            v-model="formData.category"
            :items="categoryItems"
            placeholder="Select a category"
          />
        </UFormField>

        <UFormField label="Vendor">
          <UInput
            v-model="formData.vendor"
            placeholder="e.g., Meta, Google"
          />
        </UFormField>

        <UFormField label="Owner Team">
          <USelect
            v-model="formData.ownerTeam"
            :items="teamItems"
            placeholder="Select a team (optional)"
          />
          <template v-if="teamsError" #help>
            <span class="text-(--ui-color-error-500)">Failed to load teams</span>
          </template>
        </UFormField>

        <UAlert
          v-if="fromComponent"
          color="info"
          variant="subtle"
          icon="i-lucide-link"
          title="Linked Component"
          :description="`This technology will be linked to component: ${fromComponent}`"
        />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="errorMessage"
        />

        <UAlert
          v-if="successMessage"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
          :description="successMessage"
        />

        <div class="flex items-center gap-4 pt-4 border-t border-(--ui-border)">
          <UButton
            type="submit"
            :loading="isSubmitting"
            :label="isSubmitting ? 'Saving...' : 'Save Technology'"
            color="primary"
          />
          <UButton
            label="Cancel"
            to="/technologies"
            variant="outline"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface TeamsResponse {
  success: boolean
  data: { name: string }[]
  count: number
}

const route = useRoute()

const componentTypeToCategoryMap: Record<string, string> = {
  framework: 'framework',
  library: 'library',
  platform: 'platform',
  application: 'tool',
  container: 'platform',
  'operating-system': 'platform'
}

function mapComponentTypeToCategory(type: string | undefined): string {
  if (!type) return ''
  return componentTypeToCategoryMap[type] || 'other'
}

const formData = ref({
  name: (route.query.name as string) || '',
  category: mapComponentTypeToCategory(route.query.componentType as string | undefined),
  vendor: '',
  ownerTeam: '',
  componentName: (route.query.componentName as string) || '',
  componentPackageManager: (route.query.componentPackageManager as string) || ''
})

const fromComponent = computed(() => {
  if (!formData.value.componentName) return null
  const group = route.query.componentGroup as string | undefined
  const name = formData.value.componentName
  return group ? `${group}/${name}` : name
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

const { data: teamsData, error: teamsError } = await useFetch<TeamsResponse>('/api/teams')
const teamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const categoryItems = [
  { label: 'Language', value: 'language' },
  { label: 'Framework', value: 'framework' },
  { label: 'Library', value: 'library' },
  { label: 'Database', value: 'database' },
  { label: 'Cache', value: 'cache' },
  { label: 'Container', value: 'container' },
  { label: 'Platform', value: 'platform' },
  { label: 'Tool', value: 'tool' },
  { label: 'Runtime', value: 'runtime' },
  { label: 'Other', value: 'other' }
]

function validateField(field: string) {
  switch (field) {
    case 'name':
      if (!formData.value.name) {
        fieldErrors.value.name = 'Technology name is required'
      } else {
        delete fieldErrors.value.name
      }
      break
  }
}

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; error?: string }>('/api/technologies', {
      method: 'POST',
      body: {
        name: formData.value.name,
        category: formData.value.category,
        vendor: formData.value.vendor || undefined,
        ownerTeam: formData.value.ownerTeam || undefined,
        componentName: formData.value.componentName || undefined,
        componentPackageManager: formData.value.componentPackageManager || undefined
      }
    })

    if (response.success) {
      successMessage.value = 'Technology created successfully!'
      setTimeout(() => navigateTo(`/technologies/${encodeURIComponent(formData.value.name)}`), 1500)
    } else {
      errorMessage.value = response.error || 'Failed to create technology'
    }
  } catch (error: unknown) {
    const err = error as { statusCode?: number; data?: { message?: string; error?: string }; message?: string }
    if (err.statusCode === 409) {
      errorMessage.value = err.data?.message || 'A technology with this name already exists'
    } else if (err.statusCode === 422) {
      errorMessage.value = err.data?.message || 'Invalid input data. Please check your entries.'
    } else if (err.statusCode === 400) {
      errorMessage.value = err.data?.message || 'Missing required fields'
    } else {
      errorMessage.value = err.data?.message || err.message || 'An unexpected error occurred'
    }
  } finally {
    isSubmitting.value = false
  }
}

useHead({ title: 'Create Technology - Polaris' })
</script>
