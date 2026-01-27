<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div>
        <h1>Profile</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Your account information and team memberships</p>
      </div>

      <!-- Not Authenticated -->
      <UiCard v-if="status !== 'authenticated'">
        <div class="text-center" style="padding: 3rem;">
          <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 style="margin-top: 1rem;">Not Signed In</h3>
          <p class="text-muted" style="margin-top: 0.5rem;">Sign in to view your profile</p>
          <div style="margin-top: 1.5rem;">
            <NuxtLink to="/auth/signin" class="btn btn-primary">Sign In</NuxtLink>
          </div>
        </div>
      </UiCard>

      <!-- Authenticated -->
      <template v-else-if="session?.user">
        <!-- User Info Card -->
        <UiCard>
          <template #header>
            <h2>Account Information</h2>
          </template>

          <div class="flex" style="gap: 1.5rem;">
            <img 
              v-if="session.user.image" 
              :src="session.user.image" 
              :alt="session.user.name || 'User'"
              style="width: 6rem; height: 6rem; border-radius: 50%; border: 4px solid var(--color-primary);"
            >
            <div v-else class="user-avatar" style="width: 6rem; height: 6rem; font-size: 2rem;">
              {{ ((session.user?.name || session.user?.email || 'U')[0] || 'U').toUpperCase() }}
            </div>

            <div class="space-y" style="flex: 1; --space: 1rem;">
              <div>
                <label class="text-sm text-muted">Name</label>
                <p class="font-semibold text-lg">{{ session.user.name || 'Not provided' }}</p>
              </div>
              <div>
                <label class="text-sm text-muted">Email</label>
                <p>{{ session.user.email }}</p>
              </div>
              <div>
                <label class="text-sm text-muted">Provider</label>
                <p>GitHub</p>
              </div>
              <div>
                <label class="text-sm text-muted">User ID</label>
                <p><code>{{ session.user.id }}</code></p>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Role and Permissions -->
        <UiCard>
          <template #header>
            <h2>Role & Permissions</h2>
          </template>

          <div class="space-y" style="--space: 1rem;">
            <div>
              <label class="text-sm text-muted">Role</label>
              <div style="margin-top: 0.25rem;">
                <UiBadge :variant="session.user.role === 'superuser' ? 'error' : 'primary'">
                  {{ session.user.role === 'superuser' ? 'Superuser' : 'User' }}
                </UiBadge>
              </div>
            </div>
            <div v-if="session.user.role === 'superuser'">
              <p class="text-sm text-muted">As a superuser, you have full access to all features including user management.</p>
            </div>
          </div>
        </UiCard>

        <!-- Team Memberships -->
        <UiCard>
          <template #header>
            <h2>Team Memberships</h2>
          </template>

          <div v-if="session.user.teams && session.user.teams.length > 0" class="space-y" style="--space: 0.5rem;">
            <div v-for="team in session.user.teams" :key="team.name" style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem;">
              <strong>{{ team.name }}</strong>
              <p v-if="team.responsibilityArea" class="text-sm text-muted">{{ team.responsibilityArea }}</p>
            </div>
          </div>
          <p v-else class="text-muted">You are not a member of any teams.</p>
        </UiCard>

        <!-- Sign Out -->
        <UiCard>
          <button class="btn btn-secondary" style="color: var(--color-error);" @click="signOut({ callbackUrl: '/' })">
            Sign Out
          </button>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { data: session, status, signOut } = useAuth()

useHead({ title: 'Profile - Polaris' })
</script>
