<template>
  <div class="space-y-6">
    <UPageHeader
      title="Team Approvals"
      description="Technology approval workflow for teams"
    />

    <UCard>
      <div>
        <h2>Overview</h2>
        <p>Team approvals allow organizations to control which technologies teams can use. This ensures compliance with organizational standards while giving teams flexibility within approved boundaries.</p>

        <h2>Approval Workflow</h2>
        <ol>
          <li><strong>Request</strong> — Team requests approval to use a technology</li>
          <li><strong>Review</strong> — Technology stewards review the request</li>
          <li><strong>Decision</strong> — Request is approved, denied, or requires changes</li>
          <li><strong>Implementation</strong> — Approved technologies can be used by the team</li>
        </ol>

        <h2>Approval Levels</h2>
        <ul>
          <li><strong>Organization-wide</strong> — Approved for all teams automatically</li>
          <li><strong>Team-specific</strong> — Approved only for requesting team</li>
          <li><strong>Conditional</strong> — Approved with specific constraints or versions</li>
        </ul>

        <h2>Stewardship</h2>
        <p>Each technology has designated stewards responsible for:</p>
        <ul>
          <li>Reviewing approval requests</li>
          <li>Maintaining technology documentation</li>
          <li>Communicating updates and deprecations</li>
          <li>Supporting teams using the technology</li>
        </ul>

        <h2>Why Team Ownership?</h2>
        <p>Polaris assigns technology stewardship to teams rather than individuals. This is a deliberate design choice driven by three practical concerns:</p>
        <ul>
          <li><strong>Continuity</strong> — People change roles and leave organizations. When stewardship is tied to an individual, their departure creates orphaned ownership with no one actively maintaining an opinion about the technology. Teams persist across personnel changes, so stewardship survives turnover without manual reassignment.</li>
          <li><strong>Identity bootstrapping</strong> — Users only exist in Polaris after their first login via OAuth. An administrator cannot assign ownership to someone who hasn't authenticated yet. Teams exist independently of user login state, so stewardship can be established before any individual team member has signed in.</li>
          <li><strong>Shared accountability</strong> — Technology decisions benefit from collective judgment. Team-level ownership distributes the responsibility for reviewing requests, tracking versions, and communicating deprecations across multiple people rather than creating a single point of failure.</li>
        </ul>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Team Approvals - Polaris'
})
</script>
