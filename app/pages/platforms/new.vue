<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <UPageHeader
      title="Create New Platform"
      description="Manually declare infrastructure or a service that SBOM scanning can never observe"
      :links="[{ label: 'Back to Platforms', to: '/platforms', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Superuser only"
      description="Platforms carry no evidence requirement, unlike Technologies which must be linked to a Component discovered by an SBOM scan — creating one is deliberately restricted."
    />

    <UCard>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UFormField label="Platform Name" required>
          <UInput
            v-model="formData.name"
            placeholder="e.g., PostgreSQL"
            :color="fieldErrors.name ? 'error' : undefined"
            @blur="validateField('name')"
          />
          <template v-if="fieldErrors.name" #help>
            <span class="text-(--ui-color-error-500)">{{ fieldErrors.name }}</span>
          </template>
        </UFormField>

        <UFormField label="Type" required>
          <USelect
            v-model="formData.type"
            :items="typeItems"
            placeholder="Select a type"
          />
        </UFormField>

        <UFormField label="Domain">
          <USelect
            v-model="formData.domain"
            :items="domainItems"
            placeholder="Select a domain (optional)"
          />
        </UFormField>

        <UFormField label="Vendor">
          <UInput
            v-model="formData.vendor"
            placeholder="e.g., AWS, MongoDB Inc."
          />
        </UFormField>

        <UFormField label="Steward Team">
          <USelect
            v-model="formData.stewardTeam"
            :items="teamItems"
            placeholder="Select a team (optional)"
          />
          <template v-if="teamsError" #help>
            <span class="text-(--ui-color-error-500)">Failed to load teams</span>
          </template>
        </UFormField>

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
            :label="isSubmitting ? 'Saving...' : 'Save Platform'"
            color="primary"
          />
          <UButton
            label="Cancel"
            to="/platforms"
            variant="outline"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface TeamsResponse {
  success: boolean
  data: { name: string }[]
  count: number
}

const formData = ref({
  name: '',
  type: '',
  domain: '',
  vendor: '',
  stewardTeam: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

const { data: teamsData, error: teamsError } = await useFetch<TeamsResponse>('/api/teams')
const teamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const typeItems = [
  { label: 'Application', value: 'application' },
  { label: 'Framework', value: 'framework' },
  { label: 'Library', value: 'library' },
  { label: 'Container', value: 'container' },
  { label: 'Platform', value: 'platform' },
  { label: 'Operating System', value: 'operating-system' },
  { label: 'Device', value: 'device' },
  { label: 'Device Driver', value: 'device-driver' },
  { label: 'Firmware', value: 'firmware' },
  { label: 'File', value: 'file' },
  { label: 'Machine Learning Model', value: 'machine-learning-model' },
  { label: 'Data', value: 'data' }
]

const domainItems = [
  { label: 'Foundational Runtime', value: 'foundational-runtime' },
  { label: 'Framework', value: 'framework' },
  { label: 'Data Platform', value: 'data-platform' },
  { label: 'Integration Platform', value: 'integration-platform' },
  { label: 'Security & Identity', value: 'security-identity' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Observability', value: 'observability' },
  { label: 'Developer Tooling', value: 'developer-tooling' },
  { label: 'Other', value: 'other' }
]

function validateField(field: string) {
  switch (field) {
    case 'name':
      if (!formData.value.name) {
        fieldErrors.value.name = 'Platform name is required'
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
    const response = await $fetch<{ success: boolean; error?: string }>('/api/platforms', {
      method: 'POST',
      body: {
        name: formData.value.name,
        type: formData.value.type,
        domain: formData.value.domain || undefined,
        vendor: formData.value.vendor || undefined,
        stewardTeam: formData.value.stewardTeam || undefined
      }
    })

    if (response.success) {
      successMessage.value = 'Platform created successfully!'
      setTimeout(() => navigateTo(`/platforms/${encodeURIComponent(formData.value.name)}`), 1500)
    } else {
      errorMessage.value = response.error || 'Failed to create platform'
    }
  } catch (error: unknown) {
    const err = error as { statusCode?: number; data?: { message?: string; error?: string }; message?: string }
    if (err.statusCode === 403) {
      errorMessage.value = err.data?.message || 'Superuser access required to create a platform'
    } else if (err.statusCode === 409) {
      errorMessage.value = err.data?.message || 'A platform with this name already exists'
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

useHead({ title: 'Create Platform - Polaris' })
</script>
