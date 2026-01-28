<template>
  
    <div style="max-width: 48rem; margin: 0 auto;" class="space-y">
      <!-- Header -->
      <div class="page-header">
        <NuxtLink to="/systems" style="display: inline-block; margin-bottom: 0.5rem;">
          ← Back to Systems
        </NuxtLink>
        <h1>Create New System</h1>
        <p>Add a new deployable application or service</p>
      </div>

      <!-- Form -->
      <UiCard>
        <form class="space-y" @submit.prevent="handleSubmit">
          <!-- Name -->
          <div>
            <label for="name">System Name <span class="text-error">*</span></label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              pattern="[a-z0-9-]+"
              placeholder="e.g., customer-portal"
              @blur="validateField('name')"
            >
            <p v-if="fieldErrors.name" class="text-error text-sm" style="margin-top: 0.25rem;">{{ fieldErrors.name }}</p>
          </div>

          <!-- Domain -->
          <div>
            <label for="domain">Domain <span class="text-error">*</span></label>
            <input
              id="domain"
              v-model="formData.domain"
              type="text"
              required
              placeholder="e.g., customer-experience"
              @blur="validateField('domain')"
            >
            <p v-if="fieldErrors.domain" class="text-error text-sm" style="margin-top: 0.25rem;">{{ fieldErrors.domain }}</p>
          </div>

          <!-- Owner Team -->
          <div>
            <label for="ownerTeam">Owner Team <span class="text-error">*</span></label>
            <select id="ownerTeam" v-model="formData.ownerTeam" required>
              <option value="">Select a team</option>
              <option v-for="team in teams" :key="team.name" :value="team.name">{{ team.name }}</option>
            </select>
            <p v-if="teamsError" class="text-error text-sm" style="margin-top: 0.25rem;">Failed to load teams</p>
          </div>

          <!-- Business Criticality -->
          <div>
            <label for="businessCriticality">Business Criticality <span class="text-error">*</span></label>
            <select id="businessCriticality" v-model="formData.businessCriticality" required>
              <option value="">Select criticality level</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <!-- Environment -->
          <div>
            <label for="environment">Environment <span class="text-error">*</span></label>
            <select id="environment" v-model="formData.environment" required>
              <option value="">Select environment</option>
              <option value="dev">Development</option>
              <option value="test">Test</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>

          <!-- Repositories -->
          <div>
            <label>SCM Repositories</label>
            <p class="text-sm text-muted" style="margin-bottom: 0.75rem;">Add repository URLs for this system</p>
            <div class="space-y" style="--space: 0.75rem;">
              <div
                v-for="(repo, index) in formData.repositories"
                :key="index"
                style="border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem;"
              >
                <div class="flex justify-between items-center" style="margin-bottom: 0.75rem;">
                  <strong class="text-sm">Repository {{ index + 1 }}</strong>
                  <button type="button" class="text-error" style="background: none; border: none;" @click="removeRepository(index)">
                    Remove
                  </button>
                </div>
                <div style="margin-bottom: 0.5rem;">
                  <label class="text-sm">Repository URL <span class="text-error">*</span></label>
                  <input
                    v-model="repo.url"
                    type="url"
                    required
                    placeholder="https://github.com/org/repo"
                    @blur="autoFillRepository(repo)"
                  >
                </div>
                <div>
                  <label class="text-sm">Repository Name</label>
                  <input v-model="repo.name" type="text" placeholder="Auto-filled from URL">
                </div>
              </div>
              <button type="button" class="btn btn-secondary" @click="addRepository">
                + Add Repository
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="alert alert-error">{{ errorMessage }}</div>

          <!-- Success Message -->
          <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

          <!-- Actions -->
          <div class="flex items-center" style="gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
            <button type="submit" :disabled="isSubmitting" class="btn btn-primary">
              {{ isSubmitting ? 'Saving...' : 'Save System' }}
            </button>
            <NuxtLink to="/systems" class="btn btn-secondary">Cancel</NuxtLink>
          </div>
        </form>
      </UiCard>
    </div>
  </template>

<script setup lang="ts">
interface SystemFormData {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  repositories: Array<{
    url: string
    name: string
  }>
}

interface Team {
  name: string
  email: string | null
  responsibilityArea: string | null
  technologyCount: number
  systemCount: number
}

interface TeamsResponse {
  success: boolean
  data: Team[]
  count: number
  error?: string
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
const teams = computed(() => teamsData.value?.data || [])

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
      } else if (!/^[a-z0-9-]+$/.test(formData.value.name)) {
        fieldErrors.value.name = 'Use lowercase letters, numbers, and hyphens only'
      } else {
        delete fieldErrors.value.name
      }
      break
    case 'domain':
      if (!formData.value.domain) {
        fieldErrors.value.domain = 'Domain is required'
      } else {
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
    } else {
      errorMessage.value = response.error || 'Failed to create system'
    }
  } catch (error: unknown) {
    const err = error as { statusCode?: number; data?: { message?: string; error?: string }; message?: string }
    if (err.statusCode === 409) {
      errorMessage.value = err.data?.message || 'A system with this name already exists'
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

useHead({
  title: 'Create System - Polaris'
})
</script>
