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
    <main class="flex-1 overflow-auto p-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { data: session, status, signOut } = useAuth()

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
      label: 'Policies',
      icon: 'i-lucide-file-text',
      to: '/policies'
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

  // Add Users link for superusers
  if (session.value?.user?.role === 'superuser') {
    items.push({
      label: 'Users',
      icon: 'i-lucide-user-cog',
      to: '/users'
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
