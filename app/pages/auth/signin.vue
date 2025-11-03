<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to Polaris
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enterprise Technology Catalog
        </p>
      </div>

      <UiCard>
        <div class="space-y-6">
          <!-- Setup Required Warning -->
          <div v-if="!isConfigured" class="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  GitHub OAuth Not Configured
                </h3>
                <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <p>To enable authentication, you need to:</p>
                  <ol class="list-decimal list-inside mt-2 space-y-1">
                    <li>Create a GitHub OAuth app at <a href="https://github.com/settings/developers" target="_blank" class="underline">github.com/settings/developers</a></li>
                    <li>Set callback URL to: <code class="bg-yellow-100 dark:bg-yellow-800 px-1 rounded text-xs">{{ callbackUrl }}</code></li>
                    <li>Add credentials to <code class="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">.env</code> file</li>
                    <li>Restart the development server</li>
                  </ol>
                  <p class="mt-2">See <code class="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">CONTRIBUTING.md</code> for detailed instructions.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Info message -->
          <div v-else class="rounded-md bg-blue-50 dark:bg-blue-900/30 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm text-blue-700 dark:text-blue-300">
                  Authentication is required to make changes. All data is publicly viewable.
                </p>
              </div>
            </div>
          </div>

          <!-- GitHub Sign In Button -->
          <button
            :disabled="loading || !isConfigured"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="signInWithGithub"
          >
            <svg v-if="!loading" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <svg v-else class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span>{{ loading ? 'Signing in...' : 'Sign in with GitHub' }}</span>
          </button>

          <!-- Error message -->
          <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Back to home -->
          <div class="text-center">
            <NuxtLink 
              to="/" 
              class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
            >
              ← Back to Dashboard
            </NuxtLink>
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

// Check if OAuth is configured
onMounted(async () => {
  // Get the current URL to show correct callback URL
  const baseUrl = window.location.origin
  callbackUrl.value = `${baseUrl}/api/auth/callback/github`
  
  try {
    await $fetch('/api/auth/providers')
    // If we can fetch providers but get an error on sign in, OAuth is not configured
    isConfigured.value = true
  } catch {
    isConfigured.value = false
  }
  
  // Check for error in URL
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

useHead({
  title: 'Sign In - Polaris'
})
</script>
