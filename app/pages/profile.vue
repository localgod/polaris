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

      <UCard>
        <UButton label="Sign Out" color="error" variant="outline" @click="signOut({ callbackUrl: '/' })" />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const { data: session, status, signOut } = useAuth()

useHead({ title: 'Profile - Polaris' })
</script>
