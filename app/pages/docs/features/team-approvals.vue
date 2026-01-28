<template>
  <div class="space-y">
    <div class="page-header">
      <NuxtLink to="/docs" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Documentation</NuxtLink>
      <h1>Team Approvals</h1>
      <p>Technology approval workflow for teams</p>
    </div>
    
    <UiCard>
      <div class="prose">
        <h2>Overview</h2>
        <p>Team approvals allow organizations to control which technologies teams can use. This ensures compliance with organizational standards while giving teams flexibility within approved boundaries.</p>
        
        <h2>Approval Workflow</h2>
        <ol>
          <li><strong>Request</strong> - Team requests approval to use a technology</li>
          <li><strong>Review</strong> - Technology stewards review the request</li>
          <li><strong>Decision</strong> - Request is approved, denied, or requires changes</li>
          <li><strong>Implementation</strong> - Approved technologies can be used by the team</li>
        </ol>

        <h2>Approval Levels</h2>
        <ul>
          <li><strong>Organization-wide</strong> - Approved for all teams automatically</li>
          <li><strong>Team-specific</strong> - Approved only for requesting team</li>
          <li><strong>Conditional</strong> - Approved with specific constraints or versions</li>
        </ul>

        <h2>Stewardship</h2>
        <p>Each technology has designated stewards responsible for:</p>
        <ul>
          <li>Reviewing approval requests</li>
          <li>Maintaining technology documentation</li>
          <li>Communicating updates and deprecations</li>
          <li>Supporting teams using the technology</li>
        </ul>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Team Approvals - Polaris'
})
</script>
