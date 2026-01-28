<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div>
        <h1>Registered Users</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Manage all users registered in the application</p>
      </div>

      <!-- Error State -->
      <div v-if="error" class="alert alert-error">
        {{ error.message || 'Failed to load users' }}
      </div>

      <!-- Users Table -->
      <UiCard v-else>
        <UTable
          :data="users"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-muted" style="padding: 3rem;">
              No users found.
            </div>
          </template>
        </UTable>

        <div v-if="total > pageSize" class="flex justify-center border-t border-default pt-4 mt-4">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="pageSize"
            :sibling-count="1"
            show-edges
          />
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
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

const UiBadge = resolveComponent('UiBadge')

const columns: TableColumn<User>[] = [
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original
      const initial = ((user.name || user.email || 'U')[0] || 'U').toUpperCase()

      return h('div', { class: 'flex items-center', style: 'gap: 0.75rem;' }, [
        user.avatarUrl
          ? h('img', {
              src: user.avatarUrl,
              alt: user.name,
              style: 'width: 2.5rem; height: 2.5rem; border-radius: 50%;'
            })
          : h('div', { class: 'user-avatar' }, initial),
        h('div', {}, [
          h('div', { class: 'font-medium' }, user.name || 'Unknown'),
          h('div', { class: 'text-sm text-muted' }, user.email)
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
      return h(UiBadge, {
        variant: role === 'superuser' ? 'error' : 'primary'
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
