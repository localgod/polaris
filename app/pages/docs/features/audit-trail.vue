<template>
  <div class="space-y-6">
    <UPageHeader
      title="Audit Trail"
      description="Tracking data changes for compliance and security"
    />

    <UCard>
      <div>
        <h2>Overview</h2>
        <p>Polaris includes an audit trail system that automatically tracks all data changes across the platform. Every create, update, delete, and approval operation is logged with context about who made the change, when, why, and what specifically changed.</p>

        <h2>Why Audit Trails Matter</h2>
        <ul>
          <li><strong>Compliance</strong> — Meet regulatory requirements (SOC 2, GDPR, HIPAA, PCI DSS)</li>
          <li><strong>Security</strong> — Detect and investigate unauthorized access or suspicious activities</li>
          <li><strong>Debugging</strong> — Understand what changed before a problem occurred</li>
          <li><strong>Accountability</strong> — Know who made each decision and why</li>
          <li><strong>Analytics</strong> — Analyze system usage patterns and user behavior</li>
        </ul>

        <h2>What Gets Audited</h2>

        <h3>CRUD Operations</h3>
        <ul>
          <li>Creating new technologies, systems, teams, policies</li>
          <li>Updating entity properties and configurations</li>
          <li>Deleting entities (with complete historical record)</li>
          <li>Restoring previously deleted entities</li>
        </ul>

        <h3>Approval Operations</h3>
        <ul>
          <li>Technology approvals with TIME framework categorization</li>
          <li>Version-specific approvals and rejections</li>
          <li>Approval revocations with reasons</li>
        </ul>

        <h3>Relationship Changes</h3>
        <ul>
          <li>Team ownership assignments</li>
          <li>Technology stewardship assignments</li>
          <li>System-component dependencies</li>
          <li>Policy applications</li>
        </ul>

        <h3>SBOM Operations</h3>
        <ul>
          <li>SBOM file uploads with metadata</li>
          <li>Component discovery from SBOM scanning</li>
          <li>Vulnerability detection and resolution</li>
          <li>License compliance updates</li>
        </ul>

        <h2>Audit Log Information</h2>
        <p>Each audit entry captures:</p>

        <h3>What Changed</h3>
        <ul>
          <li><strong>Entity Type</strong> — Technology, System, Team, Component, Policy, User, etc.</li>
          <li><strong>Entity ID</strong> — Unique identifier of the entity</li>
          <li><strong>Operation</strong> — CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.</li>
          <li><strong>Before/After Values</strong> — Field-level changes showing old and new values</li>
        </ul>

        <h3>Who Changed It</h3>
        <ul>
          <li><strong>User ID</strong> — Unique identifier of the user</li>
          <li><strong>User Name</strong> — Display name at time of change</li>
          <li><strong>Role</strong> — User's role when change was made</li>
        </ul>

        <h3>Context</h3>
        <ul>
          <li><strong>Timestamp</strong> — High-precision date and time</li>
          <li><strong>Reason</strong> — User-provided explanation for the change</li>
          <li><strong>Source</strong> — Where the change originated (UI, API, SBOM, System)</li>
          <li><strong>Session/Correlation ID</strong> — Groups related changes</li>
          <li><strong>IP Address</strong> — Client IP address</li>
        </ul>

        <h2>Audited Entities</h2>
        <p>The audit trail focuses on governance decisions rather than operational data:</p>
        <ul>
          <li><strong>Technology &amp; Version</strong> — Approval decisions, stewardship changes, version range updates, risk level changes</li>
          <li><strong>Team</strong> — Membership changes, responsibility area changes</li>
          <li><strong>Policy</strong> — Creation, modification, deletion, status changes, enforcement changes</li>
          <li><strong>System</strong> — Ownership changes, criticality level changes</li>
          <li><strong>Team Approvals</strong> — Technology approval/revocation, TIME category changes, EOL dates, migration targets</li>
        </ul>
        <p><strong>Not Audited:</strong> Operational data like Components (discovered via SBOM), Repositories, Hashes, Licenses, and External References are not audited as they change frequently and have low governance value.</p>

        <h2>Privacy and Security</h2>
        <ul>
          <li>Audit log access is restricted to administrators, auditors, and compliance officers</li>
          <li>The system avoids logging passwords, API tokens, credentials, or PII</li>
          <li>Audit logs are retained indefinitely by default to support compliance requirements</li>
        </ul>

        <h2>Compliance Support</h2>
        <p>Audit trails help demonstrate compliance with:</p>
        <ul>
          <li><strong>SOC 2</strong> — Access controls and monitoring</li>
          <li><strong>GDPR</strong> — Data processing activities and consent</li>
          <li><strong>HIPAA</strong> — Access to protected health information</li>
          <li><strong>PCI DSS</strong> — Changes to cardholder data environment</li>
          <li><strong>ISO 27001</strong> — Information security management</li>
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
