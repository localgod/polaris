<template>
  <div class="space-y-6">
    <UPageHeader
      title="Access Model"
      description="Who can view, create, edit, and delete each element in Polaris"
    />

    <UCard>
      <div class="prose dark:prose-invert max-w-none">
        <h2>Roles</h2>
        <p>Polaris has three access levels:</p>
        <ul>
          <li><strong>Unauthenticated</strong> — Can browse read-only data: systems, components, technologies, teams, licenses, version constraints, violations, and approvals.</li>
          <li><strong>Authenticated (User)</strong> — Can create and manage systems, technologies, version constraints, and submit SBOMs. Can view audit logs and their own profile.</li>
          <li><strong>Superuser</strong> — Full administrative access. Can manage teams, users, API tokens, license allow/deny lists, impersonation, and GitHub imports.</li>
        </ul>

        <h2>Access by Element</h2>
        <p>The table below shows which operations are available at each access level. A dash (—) means the operation does not apply to that element.</p>
      </div>
    </UCard>

    <UCard>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-(--ui-border)">
              <th class="text-left py-2 px-3 font-semibold">Element</th>
              <th class="text-left py-2 px-3 font-semibold">View</th>
              <th class="text-left py-2 px-3 font-semibold">Create</th>
              <th class="text-left py-2 px-3 font-semibold">Edit</th>
              <th class="text-left py-2 px-3 font-semibold">Delete</th>
              <th class="text-left py-2 px-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in accessRows" :key="row.element" class="border-b border-(--ui-border-muted)">
              <td class="py-2 px-3 font-medium">{{ row.element }}</td>
              <td class="py-2 px-3">
                <UBadge :color="badgeColor(row.view)" variant="subtle" size="xs">{{ row.view }}</UBadge>
              </td>
              <td class="py-2 px-3">
                <UBadge v-if="row.create !== '—'" :color="badgeColor(row.create)" variant="subtle" size="xs">{{ row.create }}</UBadge>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </td>
              <td class="py-2 px-3">
                <UBadge v-if="row.edit !== '—'" :color="badgeColor(row.edit)" variant="subtle" size="xs">{{ row.edit }}</UBadge>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </td>
              <td class="py-2 px-3">
                <UBadge v-if="row.delete !== '—'" :color="badgeColor(row.delete)" variant="subtle" size="xs">{{ row.delete }}</UBadge>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </td>
              <td class="py-2 px-3 text-(--ui-text-muted) text-xs">{{ row.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <div class="prose dark:prose-invert max-w-none">
        <h2>How Elements Are Created</h2>
        <p>Not all elements are created directly through the UI. The table below clarifies the creation path for each element.</p>
      </div>

      <div class="overflow-x-auto mt-4">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-(--ui-border)">
              <th class="text-left py-2 px-3 font-semibold">Element</th>
              <th class="text-left py-2 px-3 font-semibold">Creation Method</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in creationRows" :key="row.element" class="border-b border-(--ui-border-muted)">
              <td class="py-2 px-3 font-medium">{{ row.element }}</td>
              <td class="py-2 px-3">{{ row.method }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <div class="prose dark:prose-invert max-w-none">
        <h2>Superuser-Only Pages</h2>
        <p>The following pages and actions are only visible in the navigation and UI when the current user (or impersonated user) has the superuser role:</p>
        <ul>
          <li><strong>Users</strong> — User list and user detail pages, including technical user creation and API token management.</li>
          <li><strong>Impersonate User</strong> — View the application as another user to verify access controls.</li>
          <li><strong>License Allow/Deny</strong> — Manage the organization license whitelist and deny list.</li>
          <li><strong>Import from GitHub</strong> — Import a system from a GitHub repository on the Systems page.</li>
          <li><strong>Team management</strong> — Create, edit, and delete teams on the Teams page.</li>
        </ul>

        <h2>Impersonation</h2>
        <p>
          Superusers can impersonate other users to verify what they see. While impersonating,
          the UI respects the impersonated user's role — superuser-only actions and navigation
          items are hidden if the impersonated user is not a superuser.
        </p>

        <h2>Audit Trail</h2>
        <p>
          All create, update, and delete operations are recorded in the audit log with the
          user ID, operation type, affected entity, changed fields, and timestamp. The audit
          log is viewable by authenticated users at <code>/audit</code>.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface AccessRow {
  element: string
  view: string
  create: string
  edit: string
  delete: string
  notes: string
}

interface CreationRow {
  element: string
  method: string
}

const accessRows: AccessRow[] = [
  {
    element: 'Systems',
    view: 'Public',
    create: 'Authenticated',
    edit: 'Owner team*',
    delete: 'Owner team*',
    notes: '* Superusers or members of the system\'s owner team'
  },
  {
    element: 'Repositories',
    view: 'Public',
    create: 'Authenticated',
    edit: '—',
    delete: '—',
    notes: 'Added to systems; viewed as part of system detail'
  },
  {
    element: 'Components',
    view: 'Public',
    create: '—',
    edit: '—',
    delete: '—',
    notes: 'Created only via SBOM ingestion, never directly'
  },
  {
    element: 'Technologies',
    view: 'Public',
    create: 'Authenticated',
    edit: '—',
    delete: 'Owner team*',
    notes: '* Superusers or members of the technology\'s steward team'
  },
  {
    element: 'Teams',
    view: 'Public',
    create: 'Superuser',
    edit: 'Superuser',
    delete: 'Superuser',
    notes: 'Full team management is superuser-only'
  },
  {
    element: 'Users',
    view: 'Superuser',
    create: 'Superuser',
    edit: '—',
    delete: 'Superuser',
    notes: 'Technical users only; OAuth users are created on sign-in'
  },
  {
    element: 'API Tokens',
    view: 'Superuser',
    create: 'Superuser',
    edit: '—',
    delete: 'Superuser',
    notes: 'Managed per technical user; token value shown once'
  },
  {
    element: 'Version Constraints',
    view: 'Public',
    create: 'Authenticated',
    edit: 'Creator*',
    delete: 'Creator*',
    notes: '* Superusers or the user who created the version constraint'
  },
  {
    element: 'Licenses',
    view: 'Public',
    create: '—',
    edit: '—',
    delete: '—',
    notes: 'Discovered via SBOM ingestion; not directly managed'
  },
  {
    element: 'License Allow/Deny',
    view: 'Authenticated',
    create: 'Superuser',
    edit: 'Superuser',
    delete: 'Superuser',
    notes: 'Superusers manage the organization license whitelist'
  },
  {
    element: 'Violations',
    view: 'Authenticated',
    create: '—',
    edit: '—',
    delete: '—',
    notes: 'Compliance and version constraint violations; read-only for authenticated users'
  },
  {
    element: 'Unmapped Components',
    view: 'Authenticated',
    create: '—',
    edit: '—',
    delete: '—',
    notes: 'Components without technology mapping; read-only'
  },
  {
    element: 'Approvals',
    view: 'Public',
    create: 'Authenticated',
    edit: '—',
    delete: '—',
    notes: 'Team members approve technologies for their team'
  },
  {
    element: 'SBOMs',
    view: '—',
    create: 'Authenticated',
    edit: '—',
    delete: '—',
    notes: 'Submitted via API; creates/updates components and licenses'
  },
  {
    element: 'Audit Logs',
    view: 'Authenticated',
    create: '—',
    edit: '—',
    delete: '—',
    notes: 'Automatically generated; read-only'
  },
  {
    element: 'GitHub Import',
    view: '—',
    create: 'Superuser',
    edit: '—',
    delete: '—',
    notes: 'Creates a system from a GitHub repo without cloning'
  },
  {
    element: 'Impersonation',
    view: 'Superuser',
    create: 'Superuser',
    edit: '—',
    delete: 'Superuser',
    notes: 'Start/stop impersonation of other users'
  }
]

const creationRows: CreationRow[] = [
  { element: 'Systems', method: 'Created via the UI form or GitHub import' },
  { element: 'Repositories', method: 'Added when creating or editing a system, or via GitHub import' },
  { element: 'Components', method: 'Discovered automatically when an SBOM is submitted — never created directly' },
  { element: 'Technologies', method: 'Created via the UI form by authenticated users' },
  { element: 'Teams', method: 'Created via the UI by superusers' },
  { element: 'Users (OAuth)', method: 'Created automatically on first sign-in via GitHub OAuth' },
  { element: 'Users (Technical)', method: 'Created via the UI by superusers for API access' },
  { element: 'API Tokens', method: 'Generated via the UI by superusers for technical users' },
  { element: 'Version Constraints', method: 'Created via the UI by authenticated users' },
  { element: 'Licenses', method: 'Discovered automatically from SBOM component metadata' },
  { element: 'Approvals', method: 'Created when a team member approves a technology for their team' },
  { element: 'Audit Logs', method: 'Generated automatically on every create, update, and delete operation' }
]

function badgeColor(level: string): 'success' | 'primary' | 'error' | 'warning' | 'neutral' {
  switch (level) {
    case 'Public': return 'success'
    case 'Authenticated': return 'primary'
    case 'Superuser': return 'error'
    case 'Owner team*': return 'warning'
    case 'Creator*': return 'warning'
    default: return 'neutral'
  }
}

useHead({ title: 'Access Model - Polaris' })
</script>
