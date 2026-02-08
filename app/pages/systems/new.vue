<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <UPageHeader
      title="Create New System"
      description="Add a new deployable application or service"
      :links="[{ label: 'Back to Systems', to: '/systems', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UCard>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UFormField label="System Name" required>
          <UInput
            v-model="formData.name"
            placeholder="e.g., customer-portal"
            :color="fieldErrors.name ? 'error' : undefined"
            @blur="validateField('name')"
          />
          <template v-if="fieldErrors.name" #help>
            <span class="text-(--ui-color-error-500)">{{ fieldErrors.name }}</span>
          </template>
        </UFormField>

        <UFormField label="Domain" required>
          <UInput
            v-model="formData.domain"
            placeholder="e.g., customer-experience"
            :color="fieldErrors.domain ? 'error' : undefined"
            @blur="validateField('domain')"
          />
          <template v-if="fieldErrors.domain" #help>
            <span class="text-(--ui-color-error-500)">{{ fieldErrors.domain }}</span>
          </template>
        </UFormField>

        <UFormField label="Owner Team" required>
          <USelect
            v-model="formData.ownerTeam"
            :items="teamItems"
            placeholder="Select a team"
          />
          <template v-if="teamsError" #help>
            <span class="text-(--ui-color-error-500)">Failed to load teams</span>
          </template>
        </UFormField>

        <UFormField label="Business Criticality" required>
          <USelect
            v-model="formData.businessCriticality"
            :items="criticalityItems"
            placeholder="Select criticality level"
          />
        </UFormField>

        <UFormField label="Environment" required>
          <USelect
            v-model="formData.environment"
            :items="environmentItems"
            placeholder="Select environment"
          />
        </UFormField>

        <div>
          <h3 class="text-sm font-medium mb-1">SCM Repositories</h3>
          <p class="text-sm text-(--ui-text-muted) mb-3">Add repository URLs for this system</p>
          <div class="space-y-3">
            <UCard v-for="(repo, index) in formData.repositories" :key="index" variant="subtle">
              <div class="flex justify-between items-center mb-3">
                <strong class="text-sm">Repository {{ index + 1 }}</strong>
                <UButton
                  label="Remove"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="removeRepository(index)"
                />
              </div>
              <div class="space-y-3">
                <UFormField label="Repository URL" required>
                  <UInput
                    v-model="repo.url"
                    type="url"
                    placeholder="https://github.com/org/repo"
                    @blur="autoFillRepository(repo)"
                  />
                </UFormField>
                <UFormField label="Repository Name">
                  <UInput
                    v-model="repo.name"
                    placeholder="Auto-filled from URL"
                  />
                </UFormField>
              </div>
            </UCard>
            <UButton
              label="+ Add Repository"
              variant="outline"
              @click="addRepository"
            />
          </div>
        </div>

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
            :label="isSubmitting ? 'Saving...' : 'Save System'"
            color="primary"
          />
          <UButton
            label="Cancel"
            to="/systems"
            variant="outline"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface SystemFormData {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  repositories: Array<{ url: string; name: string }>
}

interface Team {
  name: string
}

interface TeamsResponse {
  success: boolean
  data: Team[]
  count: number
}

const formData = ref<SystemFormData>({
  name: '',
  domain: '',
  ownerTeam: '',
  businessCriticality: '',
  environment: '',
  repositories: []
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

const { data: teamsData, error: teamsError } = await useFetch<TeamsResponse>('/api/teams')
const teamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const criticalityItems = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' }
]

const environmentItems = [
  { label: 'Development', value: 'dev' },
  { label: 'Test', value: 'test' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'prod' }
]

function extractRepoName(url: string): string {
  if (!url) return ''
  url = url.replace(/\.git$/, '')
  const match = url.match(/\/([^/]+?)$/)
  if (match) return match[1]
  return ''
}

function autoFillRepository(repo: SystemFormData['repositories'][0]) {
  if (!repo.url) return
  if (!repo.name) repo.name = extractRepoName(repo.url)
}

function addRepository() {
  formData.value.repositories.push({ url: '', name: '' })
}

function removeRepository(index: number) {
  formData.value.repositories.splice(index, 1)
}

function validateField(field: string) {
  switch (field) {
    case 'name':
      if (!formData.value.name) {
        fieldErrors.value.name = 'System name is required'
      }
      else if (!/^[a-z0-9-]+$/.test(formData.value.name)) {
        fieldErrors.value.name = 'Use lowercase letters, numbers, and hyphens only'
      }
      else {
        delete fieldErrors.value.name
      }
      break
    case 'domain':
      if (!formData.value.domain) {
        fieldErrors.value.domain = 'Domain is required'
      }
      else {
        delete fieldErrors.value.domain
      }
      break
  }
}

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch('/api/systems', {
      method: 'POST',
      body: formData.value
    })

    if (response.success) {
      successMessage.value = 'System created successfully!'
      setTimeout(() => navigateTo('/systems'), 1500)
    }
    else {
      errorMessage.value = response.error || 'Failed to create system'
    }
  }
  catch (error: unknown) {
    const err = error as { statusCode?: number; data?: { message?: string; error?: string }; message?: string }
    if (err.statusCode === 409) {
      errorMessage.value = err.data?.message || 'A system with this name already exists'
    }
    else if (err.statusCode === 422) {
      errorMessage.value = err.data?.message || 'Invalid input data. Please check your entries.'
    }
    else if (err.statusCode === 400) {
      errorMessage.value = err.data?.message || 'Missing required fields'
    }
    else {
      errorMessage.value = err.data?.message || err.message || 'An unexpected error occurred'
    }
  }
  finally {
    isSubmitting.value = false
  }
}

useHead({ title: 'Create System - Polaris' })
</script>
