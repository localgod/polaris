<template>
  <div class="space-y">
    <div class="page-header">
      <h1>TIME Framework</h1>
      <p>Technology lifecycle management methodology</p>
    </div>
    
    <UiCard>
      <div>
        <h2>Overview</h2>
        <p>The TIME framework categorizes technologies based on their lifecycle stage and organizational adoption strategy:</p>
        
        <ul>
          <li><strong>Tolerate</strong> - Legacy technologies being phased out. No new projects should use these.</li>
          <li><strong>Invest</strong> - Strategic technologies receiving active investment and recommended for new projects.</li>
          <li><strong>Migrate</strong> - Technologies being actively migrated away from. Existing usage should be transitioned.</li>
          <li><strong>Eliminate</strong> - Technologies that must be removed due to security, compliance, or strategic reasons.</li>
        </ul>

        <h2>Usage in Polaris</h2>
        <p>Each technology in Polaris can be assigned a TIME classification that helps teams understand:</p>
        <ul>
          <li>Whether to adopt the technology for new projects</li>
          <li>The urgency of migration efforts</li>
          <li>Resource allocation for technology investments</li>
        </ul>

        <h2>Classification Guidelines</h2>
        <h3>Tolerate</h3>
        <p>Technologies that are stable but not strategic. They work but won't receive significant investment.</p>
        
        <h3>Invest</h3>
        <p>Technologies aligned with organizational strategy. These receive training, tooling, and active promotion.</p>
        
        <h3>Migrate</h3>
        <p>Technologies with planned replacements. Teams should create migration plans and timelines.</p>
        
        <h3>Eliminate</h3>
        <p>Technologies that pose risks. Immediate action required to remove from all systems.</p>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'TIME Framework - Polaris'
})
</script>
