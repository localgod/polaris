<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span style="font-size: 1.25rem; font-weight: 700;">Polaris</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <NuxtLink to="/" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </NuxtLink>

        <NuxtLink to="/technologies" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Technologies</span>
        </NuxtLink>

        <NuxtLink to="/systems" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <span>Systems</span>
        </NuxtLink>

        <NuxtLink to="/components" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>Components</span>
        </NuxtLink>

        <NuxtLink to="/licenses" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <span>Licenses</span>
        </NuxtLink>

        <NuxtLink to="/teams" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Teams</span>
        </NuxtLink>

        <NuxtLink to="/policies" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Policies</span>
        </NuxtLink>

        <NuxtLink to="/violations" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Violations</span>
        </NuxtLink>

        <NuxtLink to="/audit" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span>Audit Log</span>
        </NuxtLink>

        <NuxtLink v-if="session?.user?.role === 'superuser'" to="/users" class="nav-link" active-class="active">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Users</span>
        </NuxtLink>

        <!-- Documentation -->
        <button class="nav-link" style="width: 100%; text-align: left; background: none; border: none;" @click="docsExpanded = !docsExpanded">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span style="flex: 1;">Documentation</span>
          <svg :style="{ transform: docsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div v-show="docsExpanded" style="margin-left: 2rem; margin-top: 0.25rem;">
          <NuxtLink to="/docs" class="nav-link" active-class="active">Overview</NuxtLink>
          <NuxtLink to="/docs/features/time-framework" class="nav-link" active-class="active">TIME Framework</NuxtLink>
          <NuxtLink to="/docs/features/team-approvals" class="nav-link" active-class="active">Team Approvals</NuxtLink>
          <NuxtLink to="/docs/architecture/graph-model" class="nav-link" active-class="active">Graph Model</NuxtLink>
          <NuxtLink to="/api-reference" class="nav-link" active-class="active">API Reference</NuxtLink>
        </div>
      </nav>

      <!-- User Menu -->
      <div class="user-menu">
        <div v-if="status === 'authenticated' && session" class="user-info">
          <img v-if="session.user?.image" :src="session.user.image" :alt="session.user.name || 'User'" class="user-avatar" style="background: none;">
          <div v-else class="user-avatar">
            {{ ((session.user?.name || session.user?.email || 'U')[0] || 'U').toUpperCase() }}
          </div>
          <div class="user-details">
            <div class="user-name">{{ session.user?.name || 'User' }}</div>
            <div class="user-email">{{ session.user?.email }}</div>
          </div>
        </div>
        <div v-if="status === 'authenticated' && session" style="margin-top: 0.5rem;">
          <span class="badge" :class="session.user?.role === 'superuser' ? 'badge-error' : 'badge-primary'">
            {{ session.user?.role === 'superuser' ? 'Superuser' : 'User' }}
          </span>
        </div>
        <div v-if="status === 'authenticated'" style="margin-top: 0.75rem;">
          <NuxtLink to="/profile" class="nav-link">Profile</NuxtLink>
          <button class="nav-link" style="width: 100%; text-align: left; background: none; border: none; color: var(--color-error);" @click="signOut({ callbackUrl: '/' })">
            Sign Out
          </button>
        </div>
        <div v-else style="margin-top: 0.5rem;">
          <NuxtLink to="/auth/signin" class="btn btn-primary" style="width: 100%; justify-content: center;">
            Sign In
          </NuxtLink>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { data: session, status, signOut } = useAuth()
const route = useRoute()
const docsExpanded = ref(false)

watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/docs')) {
    docsExpanded.value = true
  }
}, { immediate: true })
</script>
