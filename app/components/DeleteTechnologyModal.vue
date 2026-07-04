<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Delete Technology</h3>
    </template>
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
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="outline" @click="emit('update:open', false)" />
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
