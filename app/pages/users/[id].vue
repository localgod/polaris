<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading User"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Users" to="/users" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="user">
      <!-- Header -->
      <div class="flex justify-between items-start">
        <UPageHeader
          :title="user.name || user.email"
          :description="user.name ? user.email : undefined"
          :links="[{ label: 'Back to Users', to: '/users', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex gap-2 flex-shrink-0">
          <UBadge :color="user.role === 'superuser' ? 'error' : 'neutral'" variant="subtle">
            {{ user.role }}
          </UBadge>
          <UBadge :color="user.provider === 'technical' ? 'warning' : 'success'" variant="subtle">
            {{ user.provider }}
          </UBadge>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Teams</p>
            <p class="text-2xl font-bold mt-1">{{ user.teams?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Can Manage</p>
            <p class="text-2xl font-bold mt-1">{{ user.canManage?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">API Tokens</p>
            <p class="text-2xl font-bold mt-1">{{ user.tokens?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Last Login</p>
            <p class="text-sm font-medium mt-1">{{ user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—' }}</p>
          </div>
        </UCard>
      </div>

      <!-- Teams -->
      <UCard v-if="user.teams?.length">
        <template #header>
          <h3 class="text-lg font-semibold">Team Memberships</h3>
        </template>
        <UTable :data="user.teams" :columns="teamColumns" />
      </UCard>

      <!-- API Tokens (technical users only) -->
      <UCard v-if="user.provider === 'technical'">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">API Tokens</h3>
            <UButton
              v-if="isSuperuser"
              label="Generate Token"
              icon="i-lucide-key"
              size="sm"
              @click="openTokenModal"
            />
          </div>
        </template>
        <UTable :data="user.tokens || []" :columns="tokenColumns">
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-8">
              No API tokens generated yet.
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Recent Activity -->
      <UCard v-if="user.recentActivity?.length">
        <template #header>
          <h3 class="text-lg font-semibold">Recent Activity</h3>
        </template>
        <UTable :data="user.recentActivity" :columns="activityColumns" />
      </UCard>

      <!-- Generate Token Modal -->
      <UModal v-model:open="tokenModalOpen" title="Generate API Token" description="Create a new API token for this technical user.">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Description (optional)">
              <UInput v-model="tokenDescription" placeholder="e.g. CI/CD pipeline" />
            </UFormField>
            <UFormField label="Expires in (days, leave empty for no expiration)">
              <UInput v-model="tokenExpiresInDays" type="number" placeholder="e.g. 90" />
            </UFormField>
            <UAlert v-if="tokenError" color="error" :title="tokenError" icon="i-lucide-circle-x" />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" @click="tokenModalOpen = false" />
            <UButton label="Generate" :loading="tokenLoading" @click="generateToken" />
          </div>
        </template>
      </UModal>

      <!-- Token Display Modal -->
      <UModal v-model:open="tokenDisplayOpen" title="API Token Generated" description="Copy this token now. It will not be shown again.">
        <template #body>
          <div class="space-y-4">
            <UAlert color="warning" icon="i-lucide-alert-triangle" title="This token will only be shown once. Copy it now." />
            <pre class="bg-(--ui-bg-elevated) p-4 rounded-md text-sm font-mono break-all whitespace-pre-wrap select-all">{{ generatedToken }}</pre>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Copy" icon="i-lucide-copy" variant="outline" @click="copyToken" />
            <UButton label="Done" @click="tokenDisplayOpen = false" />
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const { isSuperuser } = useEffectiveRole()

interface UserTeam {
  name: string
  email: string | null
}

interface TokenInfo {
  id: string
  createdAt: string
  expiresAt: string | null
  revoked: boolean
  description: string | null
}

interface AuditEntry {
  id: string
  timestamp: string
  operation: string
  entityType: string
  entityLabel: string | null
  source: string
}

interface UserDetail {
  id: string
  email: string
  name: string | null
  role: string
  provider: string
  avatarUrl: string | null
  lastLogin: string | null
  createdAt: string | null
  teams: UserTeam[]
  canManage: string[]
  tokens: TokenInfo[]
  recentActivity: AuditEntry[]
}

interface UserResponse {
  success: boolean
  data: UserDetail
}

const { data, pending, error, refresh } = await useFetch<UserResponse>(
  () => `/api/users/${encodeURIComponent(route.params.id as string)}`
)

const user = computed(() => data.value?.data || null)

// Team columns
const teamColumns: TableColumn<UserTeam>[] = [
  {
    accessorKey: 'name',
    header: 'Team',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      return h(resolveComponent('NuxtLink'), {
        to: `/teams/${encodeURIComponent(name)}`,
        class: 'font-medium hover:underline'
      }, () => name)
    }
  }
]

// Token columns
const tokenColumns: TableColumn<TokenInfo>[] = [
  {
    accessorKey: 'id',
    header: 'Token ID',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, (row.getValue('id') as string).substring(0, 12) + '...')
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (row.getValue('description') as string) || '—'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const d = row.getValue('createdAt') as string
      return d ? new Date(d).toLocaleDateString() : '—'
    }
  },
  {
    accessorKey: 'expiresAt',
    header: 'Expires',
    cell: ({ row }) => {
      const d = row.getValue('expiresAt') as string
      return d ? new Date(d).toLocaleDateString() : 'Never'
    }
  },
  {
    accessorKey: 'revoked',
    header: 'Status',
    cell: ({ row }) => {
      const revoked = row.getValue('revoked') as boolean
      return h(resolveComponent('UBadge'), {
        color: revoked ? 'error' : 'success',
        variant: 'subtle'
      }, () => revoked ? 'Revoked' : 'Active')
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const token = row.original
      if (token.revoked || !isSuperuser.value) return null
      return h(resolveComponent('UButton'), {
        label: 'Revoke',
        color: 'error',
        variant: 'ghost',
        size: 'xs',
        onClick: () => revokeToken(token.id)
      })
    }
  }
]

// Activity columns
const activityColumns: TableColumn<AuditEntry>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => {
      const d = row.getValue('timestamp') as string
      return d ? new Date(d).toLocaleString() : '—'
    }
  },
  {
    accessorKey: 'operation',
    header: 'Operation',
    cell: ({ row }) => {
      const op = row.getValue('operation') as string
      const colorMap: Record<string, string> = { CREATE: 'success', UPDATE: 'warning', DELETE: 'error', IMPORT_SBOM: 'info' }
      return h(resolveComponent('UBadge'), { color: colorMap[op] || 'neutral', variant: 'subtle' }, () => op)
    }
  },
  {
    accessorKey: 'entityType',
    header: 'Entity Type'
  },
  {
    accessorKey: 'entityLabel',
    header: 'Entity',
    cell: ({ row }) => (row.getValue('entityLabel') as string) || '—'
  }
]

// Token generation
const tokenModalOpen = ref(false)
const tokenDescription = ref('')
const tokenExpiresInDays = ref('')
const tokenLoading = ref(false)
const tokenError = ref('')
const tokenDisplayOpen = ref(false)
const generatedToken = ref('')

function openTokenModal() {
  tokenDescription.value = ''
  tokenExpiresInDays.value = ''
  tokenError.value = ''
  tokenModalOpen.value = true
}

async function generateToken() {
  tokenLoading.value = true
  tokenError.value = ''

  try {
    const result = await $fetch<{ success: boolean; data: { token: string } }>(
      `/api/admin/users/${route.params.id}/tokens`,
      {
        method: 'POST',
        body: {
          description: tokenDescription.value || undefined,
          expiresInDays: tokenExpiresInDays.value ? parseInt(tokenExpiresInDays.value, 10) : undefined
        }
      }
    )
    tokenModalOpen.value = false
    generatedToken.value = result.data.token
    tokenDisplayOpen.value = true
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    tokenError.value = err.data?.message || err.message || 'Failed to generate token'
  } finally {
    tokenLoading.value = false
  }
}

function copyToken() {
  navigator.clipboard.writeText(generatedToken.value)
}

async function revokeToken(tokenId: string) {
  if (!confirm('Revoke this token? This cannot be undone.')) return

  try {
    await $fetch(`/api/admin/users/${route.params.id}/tokens/${tokenId}`, { method: 'DELETE' })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to revoke token')
  }
}
</script>
