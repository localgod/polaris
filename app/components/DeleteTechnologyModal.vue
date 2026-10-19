<template>
  <UModal :open="open" title="Delete Technology" @update:open="emit('update:open', $event)">
    <template #body>
      <p>
        Are you sure you want to delete <strong>{{ techName }}</strong>?
        This will remove the technology and all its relationships.
      </p>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :description="error"
        class="mt-4"
      />
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton
          label="Delete"
          color="error"
          :loading="loading"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  techName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  deleted: []
}>()

const loading = ref(false)
const error = ref('')

async function confirmDelete() {
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(props.techName)}`, {
      method: 'DELETE'
    })
    emit('update:open', false)
    emit('deleted')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e.data?.message || e.message || 'Failed to delete technology'
  } finally {
    loading.value = false
  }
}
</script>
