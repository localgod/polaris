<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">API Reference</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Interactive documentation for the Polaris REST API
          </p>
        </div>
        <a
          href="/openapi.json"
          download
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download OpenAPI Spec
        </a>
      </div>

      <!-- API Reference -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <iframe
          src="/api-docs.html"
          class="w-full border-0"
          style="height: 100vh; min-height: 800px;"
          title="API Reference Documentation"
          @load="onIframeLoad"
        />
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const onIframeLoad = (event: Event) => {
  const iframe = event.target as HTMLIFrameElement
  try {
    // Try to adjust iframe height based on content
    if (iframe.contentWindow) {
      const resizeIframe = () => {
        const body = iframe.contentWindow?.document.body
        if (body) {
          const height = body.scrollHeight
          iframe.style.height = `${Math.max(height, 800)}px`
        }
      }
      
      // Initial resize
      setTimeout(resizeIframe, 100)
      
      // Watch for content changes
      const observer = new MutationObserver(resizeIframe)
      if (iframe.contentWindow.document.body) {
        observer.observe(iframe.contentWindow.document.body, {
          childList: true,
          subtree: true,
          attributes: true
        })
      }
    }
  } catch {
    // Cross-origin restrictions - just use fixed height
    console.log('Using fixed iframe height due to cross-origin restrictions')
  }
}

useHead({
  title: 'API Reference - Polaris',
  meta: [
    {
      name: 'description',
      content: 'Interactive API documentation for the Polaris technology catalog REST API'
    }
  ]
})
</script>
