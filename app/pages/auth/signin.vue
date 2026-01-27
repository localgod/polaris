<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; background: var(--color-bg);">
    <div style="max-width: 28rem; width: 100%;">
      <div class="text-center">
        <h2 class="text-3xl font-bold">Sign in to Polaris</h2>
        <p class="text-muted" style="margin-top: 0.5rem;">Enterprise Technology Catalog</p>
      </div>

      <UiCard style="margin-top: 2rem;">
        <div class="space-y">
          <!-- Setup Required Warning -->
          <div v-if="!isConfigured" class="alert alert-warning">
            <strong>GitHub OAuth Not Configured</strong>
            <p style="margin-top: 0.5rem;">To enable authentication, you need to:</p>
            <ol style="margin-top: 0.5rem; margin-left: 1.5rem; list-style: decimal;">
              <li>Create a GitHub OAuth app at <a href="https://github.com/settings/developers" target="_blank">github.com/settings/developers</a></li>
              <li>Set callback URL to: <code>{{ callbackUrl }}</code></li>
              <li>Add credentials to <code>.env</code> file</li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <!-- Info message -->
          <div v-else class="alert alert-info">
            Authentication is required to make changes. All data is publicly viewable.
          </div>

          <!-- GitHub Sign In Button -->
          <button
            :disabled="loading || !isConfigured"
            class="btn btn-secondary"
            style="width: 100%; justify-content: center;"
            @click="signInWithGithub"
          >
            <svg v-if="!loading" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div v-else class="spinner" style="width: 1.25rem; height: 1.25rem;"/>
            <span style="margin-left: 0.5rem;">{{ loading ? 'Signing in...' : 'Sign in with GitHub' }}</span>
          </button>

          <!-- Error message -->
          <div v-if="error" class="alert alert-error">{{ error }}</div>

          <!-- Back to home -->
          <div class="text-center">
            <NuxtLink to="/">← Back to Dashboard</NuxtLink>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { signIn } = useAuth()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const isConfigured = ref(true)
const callbackUrl = ref('')

onMounted(async () => {
  const baseUrl = window.location.origin
  callbackUrl.value = `${baseUrl}/api/auth/callback/github`
  
  try {
    await $fetch('/api/auth/providers')
    isConfigured.value = true
  } catch {
    isConfigured.value = false
  }
  
  if (route.query.error) {
    if (route.query.error === 'OAuthSignin') {
      error.value = 'GitHub OAuth is not configured. Please check your environment variables.'
      isConfigured.value = false
    } else {
      error.value = `Authentication error: ${route.query.error}`
    }
  }
})

const signInWithGithub = async () => {
  if (!isConfigured.value) {
    error.value = 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await signIn('github', { 
      callbackUrl: (route.query.callbackUrl as string) || '/'
    })
  } catch (e) {
    error.value = 'Failed to sign in. Please try again.'
    console.error('Sign in error:', e)
  } finally {
    loading.value = false
  }
}

useHead({ title: 'Sign In - Polaris' })
</script>
