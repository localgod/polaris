<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div>
        <h1>Registered Users</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Manage all users registered in the application</p>
      </div>

      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading users...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-error">
        {{ error.message || 'Failed to load users' }}
      </div>

      <!-- Users Table -->
      <UiCard v-else-if="users && users.length > 0">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Teams</th>
              <th>Last Login</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="flex items-center" style="gap: 0.75rem;">
                  <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name" style="width: 2.5rem; height: 2.5rem; border-radius: 50%;">
                  <div v-else class="user-avatar">
                    {{ ((user.name || user.email || 'U')[0] || 'U').toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium">{{ user.name || 'Unknown' }}</div>
                    <div class="text-sm text-muted">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td>{{ user.provider }}</td>
              <td>
                <UiBadge :variant="user.role === 'superuser' ? 'error' : 'primary'">
                  {{ user.role }}
                </UiBadge>
              </td>
              <td>{{ user.teamCount || 0 }}</td>
              <td>{{ user.lastLogin ? formatDate(user.lastLogin) : 'Never' }}</td>
              <td>{{ formatDate(user.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </UiCard>

      <!-- Empty State -->
      <UiCard v-else>
        <div class="text-center text-muted" style="padding: 3rem;">
          No users found.
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
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
}

const { data, pending, error } = await useFetch<UsersResponse>('/api/users')
const users = computed(() => data.value?.data || [])

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

useHead({ title: 'Users - Polaris' })
</script>
