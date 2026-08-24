<template>
  <UModal :open="open" :ui="{ footer: 'justify-end' }" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Set Up CI — {{ systemName }}</h3>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="space-y-3">
          <h4 class="text-sm font-semibold">1. Generate an API token</h4>
          <p class="text-sm text-(--ui-text-muted)">
            CI needs a Polaris API token to push SBOMs. It's only shown once — copy it into your CI secrets before closing this dialog.
          </p>
          <UButton
            v-if="!tokenGenerated"
            label="Generate CI Token"
            icon="i-lucide-key"
            size="sm"
            :loading="tokenLoading"
            @click="generateToken"
          />
          <div v-else class="space-y-2">
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-lucide-alert-triangle"
              title="This token will only be shown once. Copy it now."
            />
            <div class="flex items-start gap-2">
              <pre class="flex-1 bg-(--ui-bg-elevated) p-3 rounded-md text-sm font-mono break-all whitespace-pre-wrap select-all">{{ generatedToken }}</pre>
              <UButton icon="i-lucide-copy" variant="outline" size="sm" @click="copyText(generatedToken)" />
            </div>
          </div>
          <UAlert v-if="tokenError" color="error" variant="subtle" icon="i-lucide-circle-x" :description="tokenError" />
        </div>

        <UFormField
          v-if="repositories.length > 0 && !repoLocked"
          label="Repository"
          description="Which repo is this for? Only affects the prefilled POLARIS_REPO_URL below."
        >
          <USelect v-model="selectedRepoUrl" :items="repoItems" placeholder="Not set — GitHub Actions can auto-detect this" />
        </UFormField>
        <UAlert
          v-else-if="repoLocked"
          color="neutral"
          variant="subtle"
          icon="i-lucide-git-branch"
          :description="`Setting up CI for ${selectedRepo?.name ?? selectedRepoUrl}`"
        />

        <div class="border-t border-(--ui-border) pt-4">
          <h4 class="text-sm font-semibold mb-3">2. Wire up your CI</h4>
          <UTabs v-model="activeTab" :items="tabItems">
            <template #github>
              <div class="space-y-3 mt-3">
                <ol class="text-sm text-(--ui-text-muted) list-decimal list-inside space-y-1">
                  <li>
                    Add two repository secrets in GitHub (Settings → Secrets and variables → Actions):
                    <code class="font-mono">POLARIS_URL</code> = <code class="font-mono select-all">{{ polarisUrl }}</code>,
                    and <code class="font-mono">POLARIS_TOKEN</code> = the token generated above.
                  </li>
                  <li>Commit the workflow below as <code class="font-mono">.github/workflows/polaris-sbom.yml</code>.</li>
                </ol>
                <div class="flex justify-end gap-2">
                  <UButton label="Copy" icon="i-lucide-copy" variant="outline" size="xs" @click="copyText(workflowYaml)" />
                  <UButton label="Download" icon="i-lucide-download" variant="outline" size="xs" @click="downloadWorkflow" />
                </div>
                <pre class="bg-(--ui-bg-elevated) p-4 rounded-md text-xs font-mono whitespace-pre overflow-x-auto max-h-80 overflow-y-auto">{{ workflowYaml }}</pre>
              </div>
            </template>

            <template #custom>
              <div class="space-y-3 mt-3">
                <p class="text-sm text-(--ui-text-muted)">
                  Any CI system that can run Node.js and set protected environment variables works. Set these as
                  secrets/variables in your CI, then run the script below on every push to your default branch:
                </p>
                <ul class="text-sm space-y-1">
                  <li><code class="font-mono">POLARIS_URL</code> — <code class="font-mono select-all">{{ polarisUrl }}</code></li>
                  <li><code class="font-mono">POLARIS_TOKEN</code> — the token generated above</li>
                  <li><code class="font-mono">POLARIS_SYSTEM</code> — <code class="font-mono select-all">{{ systemName }}</code></li>
                  <li><code class="font-mono">POLARIS_REPO_URL</code> — the repository this pipeline runs against</li>
                </ul>
                <div class="flex justify-end">
                  <UButton label="Copy" icon="i-lucide-copy" variant="outline" size="xs" @click="copyText(customSnippet)" />
                </div>
                <pre class="bg-(--ui-bg-elevated) p-4 rounded-md text-xs font-mono whitespace-pre overflow-x-auto">{{ customSnippet }}</pre>
                <p class="text-sm text-(--ui-text-muted)">
                  No script runner available? Any CI can instead <code class="font-mono">POST</code> a generated SBOM
                  directly to <code class="font-mono">/api/sboms</code> with the same token — see the
                  <NuxtLink to="/api-reference" class="hover:underline font-medium">API reference</NuxtLink>.
                </p>
              </div>
            </template>
          </UTabs>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton label="Done" @click="close" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface RepositoryOption {
  name: string
  url: string
}

const props = defineProps<{
  open: boolean
  systemName: string
  repositories: RepositoryOption[]
  initialRepoUrl?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const activeTab = ref('github')
const selectedRepoUrl = ref<string | undefined>(props.initialRepoUrl)
const repoLocked = computed(() => !!props.initialRepoUrl)

const tokenLoading = ref(false)
const tokenError = ref('')
const tokenGenerated = ref(false)
const generatedToken = ref('')

const polarisUrl = ref('')
onMounted(() => {
  polarisUrl.value = window.location.origin
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  activeTab.value = 'github'
  selectedRepoUrl.value = props.initialRepoUrl
  tokenGenerated.value = false
  generatedToken.value = ''
  tokenError.value = ''
})

const repoItems = computed(() => props.repositories.map(r => ({ label: r.name, value: r.url })))
const selectedRepo = computed(() => props.repositories.find(r => r.url === selectedRepoUrl.value))

const tabItems: { label: string; slot: 'github' | 'custom'; value: string }[] = [
  { label: 'GitHub Actions', slot: 'github', value: 'github' },
  { label: 'Custom CI Server', slot: 'custom', value: 'custom' }
]

const workflowYaml = computed(() => buildGithubActionsWorkflow({
  systemName: props.systemName,
  repoUrl: selectedRepoUrl.value
}))

const customSnippet = computed(() => buildCustomCiSnippet({
  systemName: props.systemName,
  polarisUrl: polarisUrl.value || 'https://your-polaris-instance',
  repoUrl: selectedRepoUrl.value
}))

async function generateToken() {
  tokenLoading.value = true
  tokenError.value = ''

  try {
    const result = await $fetch<{ success: boolean; data: { token: string } }>('/api/me/tokens', {
      method: 'POST',
      body: {
        description: `CI/CD — ${props.systemName}`,
        type: 'ci-cd'
      }
    })
    generatedToken.value = result.data.token
    tokenGenerated.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    tokenError.value = err.data?.message || err.message || 'Failed to generate token'
  } finally {
    tokenLoading.value = false
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback: user can still select the text manually
  }
}

function downloadWorkflow() {
  const blob = new Blob([workflowYaml.value], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'polaris-sbom.yml'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
