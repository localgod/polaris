<template>
  <UModal :open="open" :ui="{ footer: 'justify-end' }" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Set TIME: {{ tech?.name }}</h3>
    </template>
    <template #body>
      <UForm id="time-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="teamName" label="Team" required>
          <UInput v-if="teamReadonly" :model-value="state.teamName" disabled />
          <USelect v-else v-model="state.teamName" :items="teamItems" placeholder="Select team" />
        </UFormField>
        <UFormField name="time" label="TIME Value" required>
          <USelect v-model="state.time" :items="timeOptions" placeholder="Select TIME value" />
        </UFormField>
        <UFormField name="notes" label="Notes">
          <UTextarea v-model="state.notes" placeholder="Optional notes" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="error" />
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton type="submit" form="time-form" :loading="loading" label="Save" />
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

const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

const timeOptions = ['invest', 'tolerate', 'migrate', 'eliminate']

const teamItems = computed(() => isSuperuser.value ? props.teamOptions : userTeams.value)
const teamReadonly = computed(() => !isSuperuser.value && userTeams.value.length === 1)

const schema = z.object({
  teamName: z.string().min(1, 'Team is required'),
  time: z.string().min(1, 'TIME value is required'),
  notes: z.string().optional()
})
type Schema = z.infer<typeof schema>

const defaultTeam = isSuperuser.value
  ? undefined
  : (userTeams.value.length === 1 ? userTeams.value[0] : undefined)

const existingApproval = defaultTeam
  ? props.tech?.approvals?.find(a => a.team === defaultTeam)
  : undefined

const loading = ref(false)
const error = ref('')
const state = reactive<Partial<Schema>>({
  teamName: defaultTeam,
  time: existingApproval?.time || undefined,
  notes: existingApproval?.notes || ''
})

watch(() => state.teamName, (newTeam) => {
  if (!newTeam || !props.tech) return
  const existing = props.tech.approvals?.find(a => a.team === newTeam)
  state.time = existing?.time || undefined
  state.notes = existing?.notes || ''
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.tech) return
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.tech.name)}/approvals`, {
      method: 'POST',
      body: {
        teamName: event.data.teamName,
        time: event.data.time,
        notes: event.data.notes || undefined
      }
    })
    emit('update:open', false)
    emit('saved')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e.data?.message || e.message || 'Failed to set TIME value'
  }
  finally {
    loading.value = false
  }
}
</script>
