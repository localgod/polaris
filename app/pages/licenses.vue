<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>License Inventory</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Licenses discovered in components across all systems</p>
      </div>

      <UiCard v-if="pending || statsPending || deniedPending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;" />
          <p class="text-muted" style="margin-top: 1rem;">Loading licenses...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error || statsError || deniedError">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error?.message || statsError?.message || deniedError?.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data && stats">
        <!-- Statistics Cards -->
        <div class="grid grid-cols-4">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Licenses</p>
              <p class="text-3xl font-bold" style="margin-top: 0.25rem;">{{ stats.data[0]?.total || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Permissive</p>
              <p class="text-3xl font-bold text-success" style="margin-top: 0.25rem;">{{ stats.data[0]?.byCategory?.permissive || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Copyleft</p>
              <p class="text-3xl font-bold text-warning" style="margin-top: 0.25rem;">{{ stats.data[0]?.byCategory?.copyleft || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Denied</p>
              <p class="text-3xl font-bold text-error" style="margin-top: 0.25rem;">{{ deniedLicenses.length }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Licenses Table -->
        <UiCard>
          <table>
            <thead>
              <tr>
                <th>License</th>
                <th>Category</th>
                <th>OSI</th>
                <th>Components</th>
                <th>Policy Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="license in data.data" :key="license.spdxId">
                <td>
                  <strong>{{ license.name }}</strong>
                  <br><code class="text-sm">{{ license.spdxId }}</code>
                </td>
                <td>
                  <UiBadge :variant="getCategoryVariant(license.category)">{{ license.category }}</UiBadge>
                </td>
                <td>
                  <UiBadge :variant="license.osiApproved ? 'success' : 'neutral'">
                    {{ license.osiApproved ? 'Yes' : 'No' }}
                  </UiBadge>
                </td>
                <td>{{ license.componentCount }}</td>
                <td>
                  <button
                    class="toggle-btn"
                    :class="{ 'toggle-denied': isLicenseDenied(license.spdxId) }"
                    :disabled="togglingLicense === license.spdxId"
                    @click="toggleLicense(license.spdxId)"
                  >
                    <span class="toggle-slider" />
                    <span class="toggle-label">
                      {{ togglingLicense === license.spdxId ? '...' : (isLicenseDenied(license.spdxId) ? 'Denied' : 'Allowed') }}
                    </span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface License {
  spdxId: string
  name: string
  category: string
  osiApproved: boolean
  componentCount: number
}

interface LicenseStats {
  total: number
  osiApproved: number
  byCategory: Record<string, number>
}

interface LicenseResponse {
  success: boolean
  data: License[]
  count: number
}

interface StatsResponse {
  success: boolean
  data: LicenseStats[]
}

interface DeniedResponse {
  success: boolean
  deniedLicenses: string[]
}

const { data, pending, error } = await useFetch<LicenseResponse>('/api/licenses')
const { data: stats, pending: statsPending, error: statsError } = await useFetch<StatsResponse>('/api/licenses/statistics')
const { data: deniedData, pending: deniedPending, error: deniedError, refresh: refreshDenied } = await useFetch<DeniedResponse>('/api/licenses/denied')

const deniedLicenses = computed(() => deniedData.value?.deniedLicenses || [])
const togglingLicense = ref<string | null>(null)

function isLicenseDenied(spdxId: string): boolean {
  return deniedLicenses.value.includes(spdxId)
}

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
}

async function toggleLicense(spdxId: string) {
  togglingLicense.value = spdxId
  
  try {
    const isDenied = isLicenseDenied(spdxId)
    const endpoint = isDenied 
      ? `/api/licenses/${encodeURIComponent(spdxId)}/allow`
      : `/api/licenses/${encodeURIComponent(spdxId)}/deny`
    
    await $fetch(endpoint, { method: 'POST' })
    await refreshDenied()
  } catch (err) {
    console.error('Failed to toggle license:', err)
  } finally {
    togglingLicense.value = null
  }
}

useHead({ title: 'Licenses - Polaris' })
</script>

<style scoped>
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: #dcfce7;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 5.5rem;
}

.toggle-btn:hover:not(:disabled) {
  border-color: #9ca3af;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-btn.toggle-denied {
  background: #fee2e2;
}

.toggle-slider {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #16a34a;
  transition: all 0.2s;
}

.toggle-denied .toggle-slider {
  background: #dc2626;
}

.toggle-label {
  color: #15803d;
}

.toggle-denied .toggle-label {
  color: #b91c1c;
}
</style>
