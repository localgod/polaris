<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  description: 'Polaris is an enterprise technology catalog that governs which technologies, versions, and components are approved for use, tracking ownership, compliance, and lifecycle risk across systems.'
})
</script>
