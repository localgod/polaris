<template>
  <div class="space-y-6">
    <!-- Header -->
    <UPageHeader
      title="Registered Users"
      description="Manage all users registered in the application"
    />

    <!-- Error State -->
    <UAlert
      v-if="error"
      color="error"
      :title="error.message || 'Failed to load users'"
      icon="i-lucide-circle-x"
    />

    <!-- Users Table -->
    <UCard v-else>
      <UTable
        :data="users"
        :columns="columns"
        :loading="pending"
        class="flex-1"
      >
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No users found.
          </div>
        </template>
      </UTable>

      <div v-if="total > pageSize" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="pageSize"
          :sibling-count="1"
          show-edges
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  provider: string
  role: string
  teamCount: number
  lastLogin: string | null
  createdAt: string
}

interface UsersResponse {
  success: boolean
  data: User[]
  count: number
  total?: number
}

const UBadge = resolveComponent('UBadge')
const UAvatar = resolveComponent('UAvatar')

const columns: TableColumn<User>[] = [
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original
      const initial = ((user.name || user.email || 'U')[0] || 'U').toUpperCase()

      return h('div', { class: 'flex items-center gap-3' }, [
        user.avatarUrl
          ? h(UAvatar, {
              src: user.avatarUrl,
              alt: user.name || 'User',
              size: 'lg'
            })
          : h(UAvatar, {
              text: initial,
              size: 'lg'
            }),
        h('div', {}, [
          h('div', { class: 'font-medium' }, user.name || 'Unknown'),
          h('div', { class: 'text-sm text-(--ui-text-muted)' }, user.email)
        ])
      ])
    }
  },
  {
    accessorKey: 'provider',
    header: 'Provider'
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return h(UBadge, {
        color: role === 'superuser' ? 'error' : 'primary',
        variant: 'subtle'
      }, () => role)
    }
  },
  {
    accessorKey: 'teamCount',
    header: 'Teams',
    cell: ({ row }) => row.original.teamCount || 0
  },
  {
    accessorKey: 'lastLogin',
    header: 'Last Login',
    cell: ({ row }) => {
      const lastLogin = row.getValue('lastLogin') as string | null
      return lastLogin ? formatDate(lastLogin) : 'Never'
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => formatDate(row.getValue('createdAt') as string)
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<UsersResponse>('/api/users', {
  query: queryParams
})

const users = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

useHead({ title: 'Users - Polaris' })
</script>
