<template>
  <div class="space-y-6">
    <UPageHeader
      title="Audit Trail"
      description="Tracking data changes for compliance and security"
    />

    <UCard>
      <div>
        <h2>Scope</h2>
        <p>The audit trail captures governance decisions — changes to version constraints, approvals, team structure, and system ownership. Operational data that changes frequently through automated processes (components discovered via SBOM, repositories, hashes, external references) is excluded.</p>

        <h2>Audited Events</h2>

        <h3>Governance Operations</h3>
        <ul>
          <li><strong>Version constraint lifecycle</strong> — creation, status changes (ACTIVATE, DEACTIVATE, ARCHIVE), deletion</li>
          <li><strong>License decisions</strong> — ALLOW_LICENSE, DENY_LICENSE, whitelist ENABLE/DISABLE</li>
          <li><strong>Technology approvals</strong> — TIME framework categorization, version-specific approvals, revocations</li>
        </ul>

        <h3>Relationship Changes</h3>
        <ul>
          <li><strong>Team membership</strong> — ADD_TEAM_MEMBER, REMOVE_TEAM_MEMBER (per-team granularity)</li>
          <li><strong>Ownership</strong> — system ownership, technology stewardship assignments</li>
          <li><strong>Version constraint enforcement</strong> — constraint-to-team application changes</li>
        </ul>

        <h2>Entry Schema</h2>
        <p>Each AuditLog node stores:</p>
        <ul>
          <li><strong>id</strong> — UUID</li>
          <li><strong>timestamp</strong> — Neo4j datetime</li>
          <li><strong>operation</strong> — e.g. ACTIVATE, DENY_LICENSE, ADD_TEAM_MEMBER</li>
          <li><strong>entityType</strong> — VersionConstraint, User, Technology, etc.</li>
          <li><strong>entityId / entityLabel</strong> — target entity identifier and display name</li>
          <li><strong>previousStatus / newStatus</strong> — before/after values</li>
          <li><strong>changedFields</strong> — array of affected field names</li>
          <li><strong>reason</strong> — auto-generated or user-provided</li>
          <li><strong>source</strong> — API, SBOM, System</li>
          <li><strong>userId</strong> — acting user's ID</li>
        </ul>

        <h3>Graph Relationships</h3>
        <ul>
          <li><strong>(AuditLog)-[:AUDITS]->(entity)</strong> — links the entry to the affected node(s). A single entry can audit multiple entities (e.g., both the User and the Team in a membership change).</li>
          <li><strong>(AuditLog)-[:PERFORMED_BY]->(User)</strong> — links to the acting user. The UI resolves the user's display name through this relationship rather than storing it on the entry.</li>
        </ul>

        <h2>Audited Entity Scope</h2>
        <ul>
          <li><strong>Technology &amp; Version</strong> — approval decisions, stewardship changes, version range updates, risk level changes</li>
          <li><strong>Team</strong> — membership changes, responsibility area changes</li>
          <li><strong>VersionConstraint</strong> — status transitions, enforcement scope changes</li>
          <li><strong>System</strong> — ownership changes, criticality level changes</li>
          <li><strong>Team Approvals</strong> — TIME category changes, EOL dates, migration targets</li>
        </ul>

        <h2>Access Control and Retention</h2>
        <ul>
          <li>Read access requires superuser role. Entries are created server-side within the same transaction as the mutation — no client-side audit writes.</li>
          <li>No credentials, tokens, or PII are stored in audit entries.</li>
          <li>Entries are append-only with indefinite retention. No purge mechanism exists; implement one if retention rules require it.</li>
        </ul>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Audit Trail - Polaris'
})
</script>
