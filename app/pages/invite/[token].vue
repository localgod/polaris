<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg)">
    <UCard class="w-full max-w-md">
      <!-- Loading -->
      <div v-if="pending" class="flex flex-col items-center gap-4 py-8">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
        <p class="text-sm text-(--ui-text-muted)">Validating invite…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center gap-4 py-8 text-center">
        <UIcon name="i-lucide-circle-x" class="size-10 text-(--ui-color-error-500)" />
        <h2 class="text-lg font-semibold">Invite unavailable</h2>
        <p class="text-sm text-(--ui-text-muted)">{{ errorMessage }}</p>
        <UButton label="Go to sign in" variant="outline" to="/auth/signin" />
      </div>

      <!-- Valid invite -->
      <div v-else-if="invite" class="flex flex-col items-center gap-6 py-6 text-center">
        <UAvatar
          v-if="invite.avatarUrl"
          :src="invite.avatarUrl"
          :alt="invite.name || invite.githubUsername"
          size="3xl"
        />
        <UAvatar
          v-else
          :text="(invite.name || invite.githubUsername)[0]?.toUpperCase()"
          size="3xl"
        />

        <div class="space-y-1">
          <h2 class="text-xl font-semibold">You've been invited to Polaris</h2>
          <p class="text-sm text-(--ui-text-muted)">
            Sign in with your GitHub account
            <strong>@{{ invite.githubUsername }}</strong> to accept.
          </p>
        </div>

        <UButton
          label="Sign in with GitHub"
          icon="i-simple-icons-github"
          size="lg"
          class="w-full"
          :loading="signingIn"
          @click="signInWithGitHub"
        />

        <p v-if="expiresInDays" class="text-xs text-(--ui-text-muted)">
          This invite expires {{ expiresInDays }}.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false, layout: false })

const route = useRoute()
const token = route.params.token as string

interface InviteData {
  githubUsername: string
  name: string | null
  avatarUrl: string | null
  expiresAt: string | null
}

const { data, pending, error } = await useFetch<{ success: boolean; data: InviteData }>(
  `/api/invite/${token}`
)

const invite = computed(() => data.value?.data ?? null)

const errorMessage = computed(() => {
  const status = (error.value as { statusCode?: number } | null)?.statusCode
  if (status === 404) return 'This invite link is invalid or has already been claimed.'
  if (status === 410) return 'This invite link has expired. Please contact your administrator.'
  return 'Something went wrong. Please try again or contact your administrator.'
})

const expiresInDays = computed(() => {
  if (!invite.value?.expiresAt) return ''
  const diff = new Date(invite.value.expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'soon'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
})

const signingIn = ref(false)
const { signIn } = useAuth()

async function signInWithGitHub() {
  signingIn.value = true
  await signIn('github', { callbackUrl: '/' })
}

useHead({ title: 'You\'ve been invited — Polaris' })
</script>
