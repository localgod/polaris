<template>
  <NuxtLayout name="default">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div>
        <NuxtLink 
          to="/systems"
          class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Systems
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Create New System</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Add a new deployable application or service
        </p>
      </div>

      <!-- Form -->
      <UiCard>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              System Name <span class="text-error-600">*</span>
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              pattern="[a-z0-9-]+"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'border-error-600 dark:border-error-400': fieldErrors.name }"
              placeholder="e.g., customer-portal"
              @blur="validateField('name')"
            >
            <p v-if="fieldErrors.name" class="mt-1 text-sm text-error-600 dark:text-error-400">
              {{ fieldErrors.name }}
            </p>
          </div>

          <!-- Domain -->
          <div>
            <label for="domain" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Domain <span class="text-error-600">*</span>
            </label>
            <input
              id="domain"
              v-model="formData.domain"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'border-error-600 dark:border-error-400': fieldErrors.domain }"
              placeholder="e.g., customer-experience"
              @blur="validateField('domain')"
            >
            <p v-if="fieldErrors.domain" class="mt-1 text-sm text-error-600 dark:text-error-400">
              {{ fieldErrors.domain }}
            </p>
          </div>

          <!-- Owner Team -->
          <div>
            <label for="ownerTeam" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Owner Team <span class="text-error-600">*</span>
            </label>
            <select
              id="ownerTeam"
              v-model="formData.ownerTeam"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a team</option>
              <option v-for="team in teams" :key="team.name" :value="team.name">
                {{ team.name }}
              </option>
            </select>
            <p v-if="teamsError" class="mt-1 text-sm text-error-600 dark:text-error-400">
              Failed to load teams
            </p>
          </div>

          <!-- Business Criticality -->
          <div>
            <label for="businessCriticality" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Business Criticality <span class="text-error-600">*</span>
            </label>
            <select
              id="businessCriticality"
              v-model="formData.businessCriticality"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select criticality level</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <!-- Environment -->
          <div>
            <label for="environment" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Environment <span class="text-error-600">*</span>
            </label>
            <select
              id="environment"
              v-model="formData.environment"
              required
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select environment</option>
              <option value="dev">Development</option>
              <option value="test">Test</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>

          <!-- Repositories -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              SCM Repositories
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Add repository URLs - details will be auto-filled
            </p>
            <div class="space-y-3">
              <div
                v-for="(repo, index) in formData.repositories"
                :key="index"
                class="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3"
              >
                <div class="flex items-start justify-between">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">Repository {{ index + 1 }}</h4>
                  <button
                    type="button"
                    class="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                    @click="removeRepository(index)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repository URL <span class="text-error-600">*</span>
                  </label>
                  <input
                    v-model="repo.url"
                    type="url"
                    required
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://github.com/org/repo"
                    @blur="autoFillRepository(repo)"
                  >
                </div>
                
                <button
                  v-if="!repo.showAdvanced"
                  type="button"
                  class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  @click="repo.showAdvanced = true"
                >
                  Show advanced options
                </button>
                
                <div v-if="repo.showAdvanced" class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        SCM Type
                      </label>
                      <select
                        v-model="repo.scmType"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="git">Git</option>
                        <option value="svn">SVN</option>
                        <option value="mercurial">Mercurial</option>
                        <option value="perforce">Perforce</option>
                      </select>
                    </div>
                    
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Repository Name
                      </label>
                      <input
                        v-model="repo.name"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Auto-filled from URL"
                      >
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2">
                      <input
                        v-model="repo.isPublic"
                        type="checkbox"
                        class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      >
                      <span class="text-xs text-gray-700 dark:text-gray-300">Public repository</span>
                    </label>
                    
                    <label class="flex items-center gap-2">
                      <input
                        v-model="repo.requiresAuth"
                        type="checkbox"
                        class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      >
                      <span class="text-xs text-gray-700 dark:text-gray-300">Requires authentication</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium border border-primary-600 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                @click="addRepository"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Repository
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-error-600 dark:text-error-400">{{ errorMessage }}</p>
            </div>
          </div>

          <!-- Success Message -->
          <div v-if="successMessage" class="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <p class="text-sm text-success-600 dark:text-success-400">{{ successMessage }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              <svg v-if="isSubmitting" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ isSubmitting ? 'Saving...' : 'Save System' }}
            </button>
            <NuxtLink 
              to="/systems"
              class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </NuxtLink>
          </div>
        </form>
      </UiCard>
    </div>
  </NuxtLayout>
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
    scmType: string
    name: string
    isPublic: boolean
    requiresAuth: boolean
    showAdvanced?: boolean
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

function detectScmType(url: string): string {
  if (!url) return 'git'
  
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('github.com') || 
      lowerUrl.includes('gitlab.com') || 
      lowerUrl.includes('bitbucket.org')) {
    return 'git'
  }
  
  if (lowerUrl.includes('svn.') || lowerUrl.includes('/svn/')) {
    return 'svn'
  }
  
  if (lowerUrl.includes('hg.') || lowerUrl.includes('/hg/')) {
    return 'mercurial'
  }
  
  return 'git'
}

function extractRepoName(url: string): string {
  if (!url) return ''
  
  // Remove .git suffix first
  url = url.replace(/\.git$/, '')
  
  // Extract last part of path
  const match = url.match(/\/([^/]+?)$/)
  if (match) {
    return match[1]
  }
  
  return ''
}

function isLikelyPublic(url: string): boolean {
  if (!url) return false
  
  const lowerUrl = url.toLowerCase()
  
  // GitHub/GitLab public repos
  if ((lowerUrl.includes('github.com') || lowerUrl.includes('gitlab.com')) &&
      !lowerUrl.includes('/private/')) {
    return true
  }
  
  // Bitbucket public repos
  if (lowerUrl.includes('bitbucket.org')) {
    return true
  }
  
  return false
}

function autoFillRepository(repo: SystemFormData['repositories'][0]) {
  if (!repo.url) return
  
  // Auto-detect SCM type if not already set
  if (!repo.scmType || repo.scmType === 'git') {
    repo.scmType = detectScmType(repo.url)
  }
  
  // Extract name from URL if not already set
  if (!repo.name) {
    repo.name = extractRepoName(repo.url)
  }
  
  // Smart defaults for public/auth
  const isPublic = isLikelyPublic(repo.url)
  repo.isPublic = isPublic
  repo.requiresAuth = !isPublic
}

function addRepository() {
  formData.value.repositories.push({
    url: '',
    scmType: 'git',
    name: '',
    isPublic: false,
    requiresAuth: true,
    showAdvanced: false
  })
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
      
      // Redirect to systems list after a short delay
      setTimeout(() => {
        navigateTo('/systems')
      }, 1500)
    } else {
      errorMessage.value = response.error || 'Failed to create system'
    }
  } catch (error: unknown) {
    const err = error as { 
      statusCode?: number
      data?: { message?: string, error?: string }
      message?: string 
    }
    
    // Handle specific status codes
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
