<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200">
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-gray-900 dark:text-white">Polaris</span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </NuxtLink>

          <NuxtLink
            to="/technologies"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Technologies</span>
          </NuxtLink>

          <NuxtLink
            to="/systems"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>Systems</span>
          </NuxtLink>

          <NuxtLink
            to="/components"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Components</span>
          </NuxtLink>

          <NuxtLink
            to="/teams"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Teams</span>
          </NuxtLink>

          <NuxtLink
            to="/policies"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Policies</span>
          </NuxtLink>

          <NuxtLink
            to="/violations"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Violations</span>
          </NuxtLink>

          <!-- Superuser-only menu items -->
          <NuxtLink
            v-if="session?.user?.role === 'superuser'"
            to="/users"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Users</span>
          </NuxtLink>

          <!-- Documentation with expandable tree -->
          <div>
            <button
              class="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path.startsWith('/docs') }"
              @click="docsExpanded = !docsExpanded"
            >
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Documentation</span>
              </div>
              <svg 
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': docsExpanded }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <!-- Expandable documentation tree -->
            <div v-show="docsExpanded" class="ml-8 mt-1 space-y-1">
              <NuxtLink
                to="/docs"
                class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path === '/docs' }"
              >
                Overview
              </NuxtLink>
              
              <!-- Features Section -->
              <div class="mt-2">
                <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Features</div>
                <NuxtLink
                  to="/docs/features/time-framework"
                  class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path === '/docs/features/time-framework' }"
                >
                  TIME Framework
                </NuxtLink>
                <NuxtLink
                  to="/docs/features/team-approvals"
                  class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path === '/docs/features/team-approvals' }"
                >
                  Team Approvals
                </NuxtLink>
              </div>
              
              <!-- Architecture Section -->
              <div class="mt-2">
                <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Architecture</div>
                <NuxtLink
                  to="/docs/architecture/graph-model"
                  class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path === '/docs/architecture/graph-model' }"
                >
                  Graph Model
                </NuxtLink>
              </div>
              
              <!-- API Section -->
              <div class="mt-2">
                <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">API</div>
                <NuxtLink
                  to="/docs/api/endpoints"
                  class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400': $route.path === '/docs/api/endpoints' }"
                >
                  Endpoints
                </NuxtLink>
              </div>
            </div>
          </div>
        </nav>

        <!-- Footer -->
        <div class="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <!-- User Menu / Sign In -->
          <div v-if="status === 'authenticated' && session" class="space-y-2">
            <!-- User Info Card -->
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
              <div class="flex items-center gap-3">
                <img 
                  v-if="session.user?.image" 
                  :src="session.user.image" 
                  :alt="session.user.name || 'User'"
                  class="w-10 h-10 rounded-full ring-2 ring-primary-500"
                >
                <div v-else class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center ring-2 ring-primary-500">
                  <span class="text-base font-medium text-primary-600 dark:text-primary-400">
                    {{ (session.user?.name || session.user?.email || 'U')[0].toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {{ session.user?.name || 'User' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ session.user?.email }}
                  </p>
                </div>
              </div>
              
              <!-- Role Badge -->
              <div class="flex items-center gap-2">
                <UiBadge 
                  :variant="session.user?.role === 'superuser' ? 'error' : 'primary'"
                  class="text-xs"
                >
                  <svg v-if="session.user?.role === 'superuser'" class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                  {{ session.user?.role === 'superuser' ? 'Superuser' : 'User' }}
                </UiBadge>
                
                <!-- Team Count -->
                <span v-if="session.user?.teams?.length" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ session.user.teams.length }} {{ session.user.teams.length === 1 ? 'team' : 'teams' }}
                </span>
                <span v-else class="text-xs text-yellow-600 dark:text-yellow-400">
                  No teams
                </span>
              </div>

              <!-- Teams List (if any) -->
              <div v-if="session.user?.teams?.length" class="pt-2 border-t border-gray-200 dark:border-gray-600">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teams:</p>
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="team in session.user.teams.slice(0, 3)" 
                    :key="team.name"
                    class="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {{ team.name }}
                  </span>
                  <span 
                    v-if="session.user.teams.length > 3"
                    class="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400"
                  >
                    +{{ session.user.teams.length - 3 }} more
                  </span>
                </div>
              </div>
            </div>

            <!-- Profile and Sign Out Buttons -->
            <div class="space-y-1">
              <NuxtLink
                to="/profile"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                active-class="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </NuxtLink>
              
              <button
                class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="signOut({ callbackUrl: '/' })"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <NuxtLink
            v-else
            to="/auth/signin"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Sign In</span>
          </NuxtLink>

          <!-- Divider -->
          <div class="border-t border-gray-200 dark:border-gray-700 my-2"/>

          <!-- Theme Toggle -->
          <button
            class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="toggleTheme"
          >
            <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>

          <!-- App Info -->
          <div class="flex items-center gap-3 px-3 py-2">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400">P</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">Polaris</p>
              <p class="text-xs text-gray-500 dark:text-gray-300 truncate">v0.1.0</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="pl-64">
      <main class="p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isDark, initTheme, toggleTheme } = useTheme()
const { status, data: session, signOut } = useAuth()
const route = useRoute()
const docsExpanded = ref(false)

// Auto-expand docs if on a docs page
watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/docs')) {
    docsExpanded.value = true
  }
}, { immediate: true })

onMounted(() => {
  initTheme()
})
</script>
