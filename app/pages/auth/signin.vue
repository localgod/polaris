<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full mx-auto">
      <div class="text-center">
        <h2 class="text-3xl font-bold">Sign in to Polaris</h2>
        <p class="text-(--ui-text-muted) mt-1">Enterprise Technology Catalog</p>
      </div>

      <UCard class="mt-8">
        <div class="space-y-6">
          <!-- Setup Required Warning -->
          <UAlert
            v-if="!isConfigured"
            color="warning"
            title="GitHub OAuth Not Configured"
            icon="i-lucide-triangle-alert"
          >
            <template #description>
              <p class="mt-1">To enable authentication, you need to:</p>
              <ol class="mt-2 ml-6 list-decimal space-y-1">
                <li>Create a GitHub OAuth app at <a href="https://github.com/settings/developers" target="_blank" class="underline">github.com/settings/developers</a></li>
                <li>Set callback URL to: <code>{{ callbackUrl }}</code></li>
                <li>Add credentials to <code>.env</code> file</li>
                <li>Restart the development server</li>
              </ol>
            </template>
          </UAlert>

          <!-- Info message -->
          <UAlert
            v-else
            color="info"
            title="Authentication is required to make changes. All data is publicly viewable."
            icon="i-lucide-info"
          />

          <!-- GitHub Sign In Button -->
          <UButton
            block
            :disabled="!isConfigured"
            :loading="loading"
            icon="i-lucide-github"
            label="Sign in with GitHub"
            color="neutral"
            variant="outline"
            size="lg"
            @click="signInWithGithub"
          />

          <!-- Error message -->
          <UAlert
            v-if="error"
            color="error"
            :title="error"
            icon="i-lucide-circle-x"
          />

          <!-- Back to home -->
          <div class="text-center">
            <UButton
              to="/"
              variant="link"
              label="← Back to Dashboard"
            />
          </div>
        </div>
      </UCard>
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
