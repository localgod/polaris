<template>
  <UModal :open="open" :ui="{ footer: 'justify-end' }" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Edit Technology: {{ tech?.name }}</h3>
    </template>
    <template #body>
      <UForm id="edit-tech-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="type" label="Type" required>
          <USelect v-model="state.type" :items="typeOptions" />
        </UFormField>
        <UFormField name="domain" label="Domain">
          <USelect v-model="state.domain" :items="domainOptions" placeholder="No domain" />
        </UFormField>
        <UFormField name="vendor" label="Vendor">
          <UInput v-model="state.vendor" placeholder="e.g. Google, Microsoft" />
        </UFormField>
        <UFormField name="ownerTeam" label="Owner Team">
          <USelect v-model="state.ownerTeam" :items="teamOptions" placeholder="No owner team" />
        </UFormField>
        <UFormField name="lastReviewed" label="Last Reviewed">
          <UInput v-model="state.lastReviewed" type="date" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="error" />
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton type="submit" form="edit-tech-form" :loading="loading" label="Save" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Technology } from '~~/types/api'

const props = defineProps<{
  open: boolean
  tech: Technology | null
  teamOptions: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const typeOptions = [
  'application', 'framework', 'library', 'container', 'platform',
  'operating-system', 'device', 'device-driver', 'firmware',
  'file', 'machine-learning-model', 'data'
]

const domainOptions = [
  'foundational-runtime', 'framework', 'data-platform',
  'integration-platform', 'security-identity', 'infrastructure',
  'observability', 'developer-tooling', 'other'
]

const schema = z.object({
  type: z.string().min(1, 'Type is required'),
  domain: z.string().optional(),
  vendor: z.string().optional(),
  ownerTeam: z.string().optional(),
  lastReviewed: z.string().optional()
})
type Schema = z.infer<typeof schema>

const loading = ref(false)
const error = ref('')
const state = reactive<Partial<Schema>>({
  type: props.tech?.type || '',
  domain: props.tech?.domain || undefined,
  vendor: props.tech?.vendor || '',
  ownerTeam: props.tech?.ownerTeamName || undefined,
  lastReviewed: props.tech?.lastReviewed || ''
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.tech) return
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.tech.name)}`, {
      method: 'PUT',
      body: {
        type: event.data.type,
        domain: event.data.domain || null,
        vendor: event.data.vendor || null,
        ownerTeam: event.data.ownerTeam || null,
        lastReviewed: event.data.lastReviewed || null
      }
    })
    emit('update:open', false)
    emit('saved')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e.data?.message || e.message || 'Failed to update technology'
  }
  finally {
    loading.value = false
  }
}
</script>
