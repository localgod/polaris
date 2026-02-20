<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <!-- Logo -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-lucide-zap" class="w-6 h-6 text-(--ui-primary)" />
            <span class="text-xl font-bold">Polaris</span>
          </NuxtLink>
          <ClientOnly>
            <UColorModeButton color="neutral" variant="ghost" />
            <template #fallback>
              <div class="w-8 h-8" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 px-6 overflow-y-auto">
        <!-- Main Menu -->
        <UNavigationMenu
          orientation="vertical"
          :items="mainMenuItems"
          class="w-full"
        />

        <!-- User Section -->
        <div class="my-4 py-4 border-t border-b border-gray-200 dark:border-gray-800">
          <template v-if="status === 'authenticated' && session">
            <div class="flex items-center gap-3 mb-3">
              <UAvatar
                v-if="session.user?.image"
                :src="session.user.image"
                :alt="session.user.name || 'User'"
                size="sm"
              />
              <UAvatar
                v-else
                :text="((session.user?.name || session.user?.email || 'U')[0] || 'U').toUpperCase()"
                size="sm"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ session.user?.name || 'User' }}</div>
                <div class="text-xs text-gray-500 truncate">{{ session.user?.email }}</div>
              </div>
            </div>
            <UBadge
              :color="session.user?.role === 'superuser' ? 'error' : 'primary'"
              size="xs"
              class="mb-3"
            >
              {{ session.user?.role === 'superuser' ? 'Superuser' : 'User' }}
            </UBadge>
            <UNavigationMenu
              orientation="vertical"
              :items="userMenuItems"
              class="w-full"
            />
          </template>
          <template v-else>
            <UButton to="/auth/signin" color="primary" block>
              Sign In
            </UButton>
          </template>
        </div>

        <!-- Documentation Menu -->
        <UNavigationMenu
          orientation="vertical"
          :items="docsMenuItems"
          class="w-full"
        />
      </nav>


    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <!-- Impersonation Banner -->
      <div
        v-if="impersonation.active && impersonation.user"
        class="bg-amber-500 dark:bg-amber-600 text-white px-6 py-2 flex items-center justify-between text-sm"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-eye" class="w-4 h-4" />
          <span>
            Viewing as <strong>{{ impersonation.user.name || impersonation.user.email }}</strong>
            ({{ impersonation.user.role }})
          </span>
        </div>
        <UButton
          label="Stop Impersonating"
          color="neutral"
          variant="solid"
          size="xs"
          :loading="impersonationLoading"
          @click="stopImpersonating"
        />
      </div>
      <div class="p-6">
        <slot />
      </div>
    </main>

    <!-- Impersonate User Modal -->
    <UModal v-model:open="impersonateModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Impersonate User</h3>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-4">
          Select a user to view the application as them. All permission checks will use their role and team memberships.
        </p>

        <UInput
          v-model="userSearch"
          placeholder="Search users..."
          icon="i-lucide-search"
          class="mb-4"
        />

        <div v-if="usersLoading" class="text-center py-4 text-(--ui-text-muted)">
          Loading users...
        </div>

        <div v-else class="divide-y divide-(--ui-border) max-h-80 overflow-y-auto">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="flex items-center justify-between py-3 px-1 hover:bg-(--ui-bg-elevated) rounded cursor-pointer"
            @click="impersonateUser(user.id)"
          >
            <div>
              <p class="text-sm font-medium">{{ user.name || user.email }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ user.email }}</p>
            </div>
            <UBadge :color="user.role === 'superuser' ? 'error' : 'neutral'" variant="subtle" size="xs">
              {{ user.role }}
            </UBadge>
          </div>
          <p v-if="filteredUsers.length === 0" class="text-sm text-(--ui-text-muted) text-center py-4">
            No users found.
          </p>
        </div>

        <UAlert
          v-if="impersonateError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="impersonateError"
          class="mt-4"
        />
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton label="Cancel" variant="outline" @click="impersonateModalOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { data: session, status, signOut } = useAuth()
const { impersonation, impersonationLoading, fetchImpersonationStatus, startImpersonating, stopImpersonating } = useImpersonation()
const { isSuperuser } = useEffectiveRole()

// Fetch impersonation status on load for superusers
watch(() => session.value?.user?.role, async (role) => {
  if (role === 'superuser') {
    await fetchImpersonationStatus()
  }
}, { immediate: true })

// Impersonate modal state
const impersonateModalOpen = ref(false)
const userSearch = ref('')
const impersonateError = ref('')
const usersLoading = ref(false)
const allUsers = ref<{ id: string; email: string; name: string | null; role: string }[]>([])

const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase()
  const currentUserId = session.value?.user?.id
  return allUsers.value
    .filter(u => u.id !== currentUserId)
    .filter(u => !q || u.email.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q)))
})

async function openImpersonateModal() {
  impersonateModalOpen.value = true
  impersonateError.value = ''
  userSearch.value = ''
  usersLoading.value = true
  try {
    const data = await $fetch<{ success: boolean; data: { id: string; email: string; name: string | null; role: string }[] }>('/api/users?limit=200')
    allUsers.value = data.data || []
  } catch {
    allUsers.value = []
  } finally {
    usersLoading.value = false
  }
}

async function impersonateUser(userId: string) {
  impersonateError.value = ''
  try {
    await startImpersonating(userId)
    impersonateModalOpen.value = false
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    impersonateError.value = error.data?.message || error.message || 'Failed to impersonate user'
  }
}

const mainMenuItems = computed<NavigationMenuItem[][]>(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'Home',
      icon: 'i-lucide-home',
      to: '/'
    },
    {
      label: 'Technologies',
      icon: 'i-lucide-settings',
      to: '/technologies'
    },
    {
      label: 'Systems',
      icon: 'i-lucide-cpu',
      to: '/systems'
    },
    {
      label: 'Components',
      icon: 'i-lucide-box',
      to: '/components'
    },
    {
      label: 'Licenses',
      icon: 'i-lucide-scale',
      to: '/licenses'
    },
    {
      label: 'Teams',
      icon: 'i-lucide-users',
      to: '/teams'
    },
    {
      label: 'Version Constraints',
      icon: 'i-lucide-file-text',
      to: '/version-constraints'
    },
    {
      label: 'Violations',
      icon: 'i-lucide-alert-triangle',
      to: '/violations'
    },
    {
      label: 'Audit Log',
      icon: 'i-lucide-clipboard-list',
      to: '/audit'
    }
  ]

  // Add admin items for superusers (hidden when impersonating a non-superuser)
  if (isSuperuser.value) {
    items.push({
      label: 'Users',
      icon: 'i-lucide-user-cog',
      to: '/users'
    })
    items.push({
      label: 'Impersonate User',
      icon: 'i-lucide-eye',
      onSelect: () => openImpersonateModal()
    })
  }

  return [items]
})

const docsMenuItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Documentation',
      type: 'label'
    },
    {
      label: 'Core Concepts',
      icon: 'i-lucide-book-open',
      to: '/docs/concepts'
    },
    {
      label: 'TIME Framework',
      icon: 'i-lucide-clock',
      to: '/docs/features/time-framework'
    },
    {
      label: 'Team Approvals',
      icon: 'i-lucide-check-circle',
      to: '/docs/features/team-approvals'
    },
    {
      label: 'Audit Trail',
      icon: 'i-lucide-clipboard-list',
      to: '/docs/features/audit-trail'
    },
    {
      label: 'Access Model',
      icon: 'i-lucide-shield',
      to: '/docs/access-model'
    },
    {
      label: 'Graph Model',
      icon: 'i-lucide-git-branch',
      to: '/docs/architecture/graph-model'
    },
    {
      label: 'API Reference',
      icon: 'i-lucide-code',
      to: '/api-reference'
    }
  ]
])

const userMenuItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile'
  },
  {
    label: 'Sign Out',
    icon: 'i-lucide-log-out',
    onSelect: () => signOut({ callbackUrl: '/' })
  }
])
</script>
