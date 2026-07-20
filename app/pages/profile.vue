<template>
  <div class="space-y-6">
    <UPageHeader
      title="Profile"
      description="Your account information and team memberships"
    />

    <!-- Not Authenticated -->
    <UCard v-if="status !== 'authenticated'">
      <div class="text-center py-12">
        <UIcon name="i-lucide-user" class="text-5xl text-(--ui-text-muted)" />
        <h3 class="mt-4">Not Signed In</h3>
        <p class="text-(--ui-text-muted) mt-2">Sign in to view your profile</p>
        <div class="mt-6">
          <UButton label="Sign In" to="/auth/signin" color="primary" />
        </div>
      </div>
    </UCard>

    <!-- Authenticated -->
    <template v-else-if="session?.user">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Account Information</h2>
        </template>

        <div class="flex gap-6">
          <UAvatar
            v-if="session.user.image"
            :src="session.user.image"
            :alt="session.user.name || 'User'"
            size="3xl"
          />
          <UAvatar
            v-else
            :text="((session.user?.name || session.user?.email || 'U')[0] || 'U').toUpperCase()"
            size="3xl"
          />

          <div class="flex-1 space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Name</span>
              <p class="font-semibold text-lg">{{ session.user.name || 'Not provided' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Email</span>
              <p>{{ session.user.email }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Provider</span>
              <p>GitHub</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">User ID</span>
              <p><code>{{ session.user.id }}</code></p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Role &amp; Permissions</h2>
        </template>

        <div class="space-y-3">
          <div>
            <span class="text-sm text-(--ui-text-muted)">Role</span>
            <div class="mt-1">
              <UBadge :color="session.user.role === 'superuser' ? 'error' : 'primary'" variant="subtle">
                {{ session.user.role === 'superuser' ? 'Superuser' : 'User' }}
              </UBadge>
            </div>
          </div>
          <p v-if="session.user.role === 'superuser'" class="text-sm text-(--ui-text-muted)">
            As a superuser, you have full access to all features including user management.
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Team Memberships</h2>
        </template>

        <div v-if="session.user.teams && session.user.teams.length > 0" class="space-y-2">
          <div
            v-for="team in session.user.teams"
            :key="team.name"
            class="p-3 rounded-lg bg-(--ui-bg-elevated)"
          >
            <strong>{{ team.name }}</strong>
            <p v-if="team.responsibilityArea" class="text-sm text-(--ui-text-muted)">{{ team.responsibilityArea }}</p>
          </div>
        </div>
        <p v-else class="text-(--ui-text-muted)">You are not a member of any teams.</p>
      </UCard>

      <!-- API Tokens -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">API Tokens</h2>
            <UButton
              label="Generate Token"
              icon="i-lucide-key"
              size="sm"
              @click="openTokenModal"
            />
          </div>
        </template>
        <UTable :data="tokens" :columns="tokenColumns">
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-8">
              No API tokens yet. Generate one to use the API from scripts or CI pipelines.
            </div>
          </template>
        </UTable>
      </UCard>

      <UCard>
        <UButton label="Sign Out" color="error" variant="outline" @click="signOut({ callbackUrl: '/' })" />
      </UCard>
    </template>

    <!-- Generate Token Modal -->
    <UModal v-model:open="tokenModalOpen" title="Generate API Token" description="Create a new API token for your account.">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Description" required>
            <UInput v-model="tokenDescription" placeholder="e.g. CI/CD pipeline" />
          </UFormField>
          <UFormField label="Type" description="Distinguishes automation tokens from personal ones in the audit trail.">
            <USelect v-model="tokenType" :items="tokenTypeOptions" />
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

    <!-- Revoke Token Confirmation Modal -->
    <UModal v-model:open="revokeModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Revoke Token</h3>
      </template>
      <template #body>
        <p>Are you sure you want to revoke this API token?</p>
        <p class="text-sm text-(--ui-text-muted) mt-2">This action cannot be undone. Any integrations using this token will stop working.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="revokeModalOpen = false" />
          <UButton
            :label="revokeLoading ? 'Revoking...' : 'Revoke'"
            color="error"
            :loading="revokeLoading"
            @click="confirmRevokeToken"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { data: session, status, signOut } = useAuth()
const toast = useToast()

useHead({ title: 'Profile - Polaris' })

interface TokenInfo {
  id: string
  createdAt: string
  expiresAt: string | null
  revoked: boolean
  description: string | null
  type: 'user' | 'ci-cd' | 'service-account'
}

const tokenTypeOptions = [
  { label: 'Personal', value: 'user' },
  { label: 'CI/CD', value: 'ci-cd' },
  { label: 'Service Account', value: 'service-account' }
]

interface TokensResponse {
  success: boolean
  data: TokenInfo[]
  count: number
}

const { data: tokensData, refresh: refreshTokens } = await useFetch<TokensResponse>(
  '/api/me/tokens',
  { default: () => ({ success: true, data: [], count: 0 }) }
)

const tokens = computed(() => tokensData.value?.data ?? [])

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
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => tokenTypeOptions.find(o => o.value === row.getValue('type'))?.label || 'Personal'
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
      if (token.revoked) return null
      return h(resolveComponent('UButton'), {
        label: 'Revoke',
        color: 'error',
        variant: 'ghost',
        size: 'xs',
        onClick: () => openRevokeModal(token.id)
      })
    }
  }
]

// Token generation
const tokenModalOpen = ref(false)
const tokenDescription = ref('')
const tokenType = ref<'user' | 'ci-cd' | 'service-account'>('user')
const tokenExpiresInDays = ref('')
const tokenLoading = ref(false)
const tokenError = ref('')
const tokenDisplayOpen = ref(false)
const generatedToken = ref('')

function openTokenModal() {
  tokenDescription.value = ''
  tokenType.value = 'user'
  tokenExpiresInDays.value = ''
  tokenError.value = ''
  tokenModalOpen.value = true
}

async function generateToken() {
  tokenLoading.value = true
  tokenError.value = ''

  try {
    const result = await $fetch<{ success: boolean; data: { token: string } }>(
      '/api/me/tokens',
      {
        method: 'POST',
        body: {
          description: tokenDescription.value,
          type: tokenType.value,
          expiresInDays: tokenExpiresInDays.value ? parseInt(tokenExpiresInDays.value, 10) : undefined
        }
      }
    )
    tokenModalOpen.value = false
    generatedToken.value = result.data.token
    tokenDisplayOpen.value = true
    await refreshTokens()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    tokenError.value = err.data?.message || err.message || 'Failed to generate token'
  } finally {
    tokenLoading.value = false
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(generatedToken.value)
  } catch {
    // Fallback: select the pre element text for manual copy
  }
}

// Revoke token
const revokeModalOpen = ref(false)
const revokeTargetId = ref<string | null>(null)
const revokeLoading = ref(false)

function openRevokeModal(tokenId: string) {
  revokeTargetId.value = tokenId
  revokeModalOpen.value = true
}

async function confirmRevokeToken() {
  if (!revokeTargetId.value) return
  revokeLoading.value = true
  try {
    await $fetch(`/api/me/tokens/${revokeTargetId.value}`, { method: 'DELETE' })
    revokeModalOpen.value = false
    await refreshTokens()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to revoke token', color: 'error' })
  } finally {
    revokeLoading.value = false
  }
}
</script>
