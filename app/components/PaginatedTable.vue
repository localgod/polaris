<template>
  <UCard>
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <UTable
      :sorting="sorting"
      :manual-sorting="manualSorting"
      :data="data"
      :columns="columns"
      :loading="loading"
      :on-select="onSelect"
      class="flex-1"
      @update:sorting="(value: SortingState) => emit('update:sorting', value)"
    >
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
    </UTable>

    <div v-if="showPagination" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
      <UPagination
        :page="page"
        :total="total!"
        :items-per-page="pageSize ?? 20"
        :sibling-count="1"
        show-edges
        @update:page="(value: number) => emit('update:page', value)"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'
import type { Row, SortingState } from '@tanstack/vue-table'

const props = withDefaults(defineProps<{
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  sorting?: SortingState
  manualSorting?: boolean
  page?: number
  total?: number
  pageSize?: number
  onSelect?: (event: Event, row: Row<T>) => void
}>(), {
  loading: false,
  manualSorting: false,
  sorting: undefined,
  page: undefined,
  total: undefined,
  pageSize: undefined,
  onSelect: undefined
})

const emit = defineEmits<{
  'update:sorting': [value: SortingState]
  'update:page': [value: number]
}>()

const showPagination = computed(() =>
  props.total !== undefined && props.page !== undefined && props.total > (props.pageSize ?? 20)
)
</script>
