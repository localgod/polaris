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

    <!-- Manage Teams Modal -->
    <UModal v-model:open="assignModalOpen" title="Manage Team Memberships" description="Toggle team memberships for this user.">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-(--ui-text-muted)">
            Managing teams for <strong>{{ assignTarget?.name || assignTarget?.email }}</strong>
          </p>

          <div v-if="teamsLoading" class="text-center py-4 text-(--ui-text-muted)">
            Loading teams...
          </div>

          <div v-else class="divide-y divide-(--ui-border)">
            <div
              v-for="team in allTeams"
              :key="team"
              class="flex items-center justify-between py-3"
            >
              <span class="text-sm font-medium">{{ team }}</span>
              <USwitch
                :model-value="teamMemberships[team] ?? false"
                @update:model-value="(val: boolean) => teamMemberships[team] = val"
              />
            </div>
          </div>

          <p v-if="!teamsLoading && allTeams.length === 0" class="text-sm text-(--ui-text-muted) text-center py-4">
            No teams available.
          </p>

          <UAlert
            v-if="assignError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="assignError"
          />

          <UAlert
            v-if="assignSuccess"
            color="success"
            variant="subtle"
            icon="i-lucide-check-circle"
            description="Team memberships updated successfully."
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" @click="closeAssignModal" />
          <UButton
            label="Save"
            color="primary"
            :loading="assignLoading"
            :disabled="assignLoading"
            @click="saveTeamMemberships"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface UserTeam {
  name: string
  email: string | null
}

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  provider: string
  role: string
  teamCount: number
  teams?: UserTeam[]
  lastLogin: string | null
  createdAt: string
}

interface UsersResponse {
  success: boolean
  data: User[]
  count: number
  total?: number
}

interface Team {
  name: string
}

interface TeamsResponse {
  success: boolean
  data: Team[]
  count: number
}

const { data: session } = useAuth()
const isSuperuser = computed(() => session.value?.user?.role === 'superuser')

const UBadge = resolveComponent('UBadge')
const UAvatar = resolveComponent('UAvatar')

// Modal state
const assignModalOpen = ref(false)
const assignTarget = ref<User | null>(null)
const teamMemberships = ref<Record<string, boolean>>({})
const assignLoading = ref(false)
const assignError = ref('')
const assignSuccess = ref(false)
const teamsLoading = ref(false)

// Fetch all teams for the switches
const { data: teamsData } = await useFetch<TeamsResponse>('/api/teams')
const allTeams = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

async function openAssignModal(user: User) {
  assignTarget.value = user
  assignError.value = ''
  assignSuccess.value = false
  teamsLoading.value = true
  assignModalOpen.value = true

  // Initialize all teams as disabled
  const memberships: Record<string, boolean> = {}
  for (const team of allTeams.value) {
    memberships[team] = false
  }

  // Fetch current memberships for this user
  try {
    const userData = await $fetch<{ success: boolean; data: User[] }>('/api/admin/users')
    const fullUser = userData.data.find(u => u.id === user.id)
    if (fullUser?.teams) {
      for (const team of fullUser.teams) {
        if (team.name) {
          memberships[team.name] = true
        }
      }
    }
  } catch {
    // If fetch fails, start with all disabled
  }

  teamMemberships.value = memberships
  teamsLoading.value = false
}

function closeAssignModal() {
  assignModalOpen.value = false
}

async function saveTeamMemberships() {
  if (!assignTarget.value) return

  assignLoading.value = true
  assignError.value = ''
  assignSuccess.value = false

  const enabledTeams = Object.entries(teamMemberships.value)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)

  try {
    await $fetch(`/api/admin/users/${assignTarget.value.id}/teams`, {
      method: 'POST',
      body: {
        teams: enabledTeams
      }
    })
    assignSuccess.value = true
    await refreshNuxtData()
    setTimeout(() => closeAssignModal(), 1000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    assignError.value = err.data?.message || err.message || 'Failed to update team memberships'
  } finally {
    assignLoading.value = false
  }
}

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
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const user = row.original

      const items = [
        [
          ...(isSuperuser.value
            ? [{
                label: 'Manage Teams',
                icon: 'i-lucide-users',
                onSelect: () => openAssignModal(user)
              }]
            : [])
        ]
      ].filter(group => group.length > 0)

      if (items.length === 0) return null

      return h(resolveComponent('UDropdownMenu'), {
        items,
        content: { align: 'end' as const }
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
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
