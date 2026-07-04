<template>
  <UModal :open="open" :ui="{ footer: 'justify-end' }" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Create Version Constraint for {{ tech?.name }}</h3>
    </template>
    <template #body>
      <UForm id="vc-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="name" label="Name" required>
          <UInput v-model="state.name" />
        </UFormField>
        <UFormField name="description" label="Description">
          <UInput v-model="state.description" placeholder="What does this constraint enforce?" />
        </UFormField>
        <UFormField name="severity" label="Severity" required>
          <USelect v-model="state.severity" :items="severityOptions" />
        </UFormField>
        <UFormField name="versionRange" label="Version Range" required>
          <UInput v-model="state.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField name="scope" label="Scope" required>
            <USelect v-model="state.scope" :items="isSuperuser ? ['organization', 'team'] : ['team']" />
          </UFormField>
          <UFormField v-if="state.scope === 'team'" name="subjectTeam" label="Team" required>
            <USelect v-model="state.subjectTeam" :items="isSuperuser ? teamOptions : userTeams" placeholder="Select team" />
          </UFormField>
        </div>
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="error" />
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton type="submit" form="vc-form" :loading="loading" label="Create" />
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
  created: []
}>()

const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

const severityOptions = ['critical', 'error', 'warning', 'info']

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  severity: z.string().min(1, 'Severity is required'),
  scope: z.string().min(1, 'Scope is required'),
  subjectTeam: z.string().optional(),
  versionRange: z.string().min(1, 'Version range is required')
}).refine(data => data.scope !== 'team' || !!data.subjectTeam, {
  message: 'Team is required when scope is team',
  path: ['subjectTeam']
})
type Schema = z.infer<typeof schema>

const loading = ref(false)
const error = ref('')

function defaultName(): string {
  const name = props.tech?.name || ''
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-version-constraint`
}

const state = reactive<Partial<Schema>>({
  name: defaultName(),
  description: '',
  severity: 'error',
  scope: isSuperuser.value ? 'organization' : 'team',
  subjectTeam: isSuperuser.value ? undefined : (userTeams.value[0] || undefined),
  versionRange: ''
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.tech) return
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/version-constraints', {
      method: 'POST',
      body: {
        name: event.data.name,
        description: event.data.description || undefined,
        severity: event.data.severity,
        scope: event.data.scope,
        subjectTeam: event.data.scope === 'team' ? event.data.subjectTeam : undefined,
        versionRange: event.data.versionRange,
        governsTechnology: props.tech.name
      }
    })
    emit('update:open', false)
    emit('created')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e.data?.message || e.message || 'Failed to create version constraint'
  }
  finally {
    loading.value = false
  }
}
</script>
