<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Your account information and team memberships
        </p>
      </div>

      <!-- Not Authenticated -->
      <UiCard v-if="status !== 'authenticated'">
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Not Signed In</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to view your profile
          </p>
          <div class="mt-6">
            <NuxtLink
              to="/auth/signin"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Sign In
            </NuxtLink>
          </div>
        </div>
      </UiCard>

      <!-- Authenticated -->
      <template v-else-if="session?.user">
        <!-- User Info Card -->
        <UiCard>
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
          </template>

          <div class="space-y-6">
            <!-- Avatar and Basic Info -->
            <div class="flex items-start gap-6">
              <img 
                v-if="session.user.image" 
                :src="session.user.image" 
                :alt="session.user.name || 'User'"
                class="w-24 h-24 rounded-full ring-4 ring-primary-500"
              >
              <div v-else class="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center ring-4 ring-primary-500">
                <span class="text-4xl font-medium text-primary-600 dark:text-primary-400">
                  {{ (session.user.name || session.user.email || 'U')[0].toUpperCase() }}
                </span>
              </div>

              <div class="flex-1 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {{ session.user.name || 'Not provided' }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                  <p class="mt-1 text-base text-gray-900 dark:text-white">
                    {{ session.user.email }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">Provider</label>
                  <div class="mt-1 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span class="text-base text-gray-900 dark:text-white capitalize">
                      {{ session.user.provider || 'GitHub' }}
                    </span>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                  <p class="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">
                    {{ session.user.id }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Role and Permissions -->
        <UiCard>
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Role & Permissions</h2>
          </template>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Role</label>
              <UiBadge 
                :variant="session.user.role === 'superuser' ? 'error' : 'primary'"
                class="text-sm"
              >
                <svg v-if="session.user.role === 'superuser'" class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
                {{ session.user.role === 'superuser' ? 'Superuser' : 'User' }}
              </UiBadge>
            </div>

            <div v-if="session.user.role === 'superuser'" class="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800 dark:text-red-300">Superuser Privileges</h3>
                  <div class="mt-2 text-sm text-red-700 dark:text-red-400">
                    <ul class="list-disc list-inside space-y-1">
                      <li>Full read/write access to all resources</li>
                      <li>Can manage users and assign teams</li>
                      <li>Can bypass team ownership restrictions</li>
                      <li>Access to admin endpoints</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="!session.user.teams?.length" class="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-300">Limited Access</h3>
                  <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <p>You are not assigned to any teams. Contact a superuser to be assigned to a team to gain write access.</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-green-800 dark:text-green-300">Authorized User</h3>
                  <div class="mt-2 text-sm text-green-700 dark:text-green-400">
                    <p>You can modify resources owned by your team(s).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Teams -->
        <UiCard>
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Team Memberships</h2>
          </template>

          <div v-if="!session.user.teams?.length" class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 class="mt-4 text-sm font-medium text-gray-900 dark:text-white">No Team Memberships</h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You are not currently assigned to any teams. Contact a superuser to be added to a team.
            </p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="team in session.user.teams"
              :key="team.name"
              class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ team.email }}</p>
                </div>
              </div>
              <NuxtLink
                :to="`/teams?filter=${encodeURIComponent(team.name)}`"
                class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                View →
              </NuxtLink>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { status, data: session } = useAuth()

useHead({
  title: 'Profile - Polaris'
})
</script>
