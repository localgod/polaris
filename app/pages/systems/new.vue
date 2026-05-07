<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <UPageHeader
      title="Create New System"
      description="Add a new deployable application or service"
      :links="[{ label: 'Back to Systems', to: '/systems', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UCard>
      <UForm ref="form" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <UFormField name="name" label="System Name" required>
          <UInput
            v-model="state.name"
            placeholder="e.g., customer-portal"
          />
        </UFormField>

        <UFormField name="domain" label="Domain" required>
          <UInput
            v-model="state.domain"
            placeholder="e.g., customer-experience"
          />
        </UFormField>

        <UFormField name="ownerTeam" label="Owner Team" required>
          <USelect
            v-model="state.ownerTeam"
            :items="teamItems"
            placeholder="Select a team"
          />
          <template v-if="teamsError" #help>
            <span class="text-(--ui-color-error-500)">Failed to load teams</span>
          </template>
        </UFormField>

        <UFormField name="businessCriticality" label="Business Criticality" required>
          <USelect
            v-model="state.businessCriticality"
            :items="criticalityItems"
            placeholder="Select criticality level"
          />
        </UFormField>

        <UFormField name="environment" label="Environment" required>
          <USelect
            v-model="state.environment"
            :items="environmentItems"
            placeholder="Select environment"
          />
        </UFormField>

        <div>
          <h3 class="text-sm font-medium mb-1">SCM Repositories</h3>
          <p class="text-sm text-(--ui-text-muted) mb-3">Add repository URLs for this system</p>
          <div class="space-y-3">
            <UCard v-for="(repo, index) in state.repositories" :key="index" variant="subtle">
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
                <UFormField :name="`repositories.${index}.url`" label="Repository URL" required>
                  <UInput
                    v-model="repo.url"
                    type="url"
                    placeholder="https://github.com/org/repo"
                    @blur="autoFillRepository(repo)"
                  />
                </UFormField>
                <UFormField :name="`repositories.${index}.name`" label="Repository Name">
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
            label="Save System"
            color="primary"
          />
          <UButton
            label="Cancel"
            to="/systems"
            variant="outline"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Team {
  name: string
}

interface TeamsResponse {
  success: boolean
  data: Team[]
  count: number
}

const schema = z.object({
  name: z.string().min(1, 'System name is required').regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  domain: z.string().min(1, 'Domain is required'),
  ownerTeam: z.string().min(1, 'Owner team is required'),
  businessCriticality: z.string().min(1, 'Business criticality is required'),
  environment: z.string().min(1, 'Environment is required'),
  repositories: z.array(z.object({
    url: z.string().url('Must be a valid URL'),
    name: z.string()
  })).default([])
})

type Schema = z.infer<typeof schema>

const form = useTemplateRef('form')
const state = reactive<Partial<Schema>>({
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

function autoFillRepository(repo: { url: string; name: string }) {
  if (!repo.url || repo.name) return
  repo.name = extractRepoName(repo.url)
}

function addRepository() {
  state.repositories ??= []
  state.repositories.push({ url: '', name: '' })
}

function removeRepository(index: number) {
  state.repositories?.splice(index, 1)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch('/api/systems', {
      method: 'POST',
      body: event.data
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
      form.value?.setErrors([{ name: 'name', message: err.data?.message || 'A system with this name already exists' }])
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
