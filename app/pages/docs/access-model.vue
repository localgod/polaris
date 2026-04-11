<template>
  <div class="space-y-6">
    <UPageHeader
      title="Access Model"
      description="Who can view, create, edit, and delete each element in Polaris"
    />

    <!-- Roles -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Roles</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">Polaris has three access levels:</p>
        <div class="space-y-3">
          <UPageFeature
            v-for="role in roles"
            :key="role.title"
            :icon="role.icon"
            :title="role.title"
            :description="role.description"
            orientation="horizontal"
          />
        </div>
      </div>
    </UCard>

    <!-- Access by Element -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-table" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Access by Element</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">Operations available at each access level. A dash (—) means the operation does not apply.</p>
        <UTable :data="accessRows" :columns="accessColumns" />
      </div>
    </UCard>

    <!-- How Elements Are Created -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-plus-circle" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">How Elements Are Created</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">Not all elements are created directly through the UI.</p>
        <UTable :data="creationRows" :columns="creationColumns" />
      </div>
    </UCard>

    <!-- Superuser-Only Pages -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-lock" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Superuser-Only Pages</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">The following pages and actions are only visible when the current user has the superuser role:</p>
        <div class="space-y-3">
          <UPageFeature
            v-for="page in superuserPages"
            :key="page.title"
            :icon="page.icon"
            :title="page.title"
            :description="page.description"
            orientation="horizontal"
          />
        </div>
      </div>
    </UCard>

    <!-- Impersonation -->
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-eye"
      title="Impersonation"
      description="Superusers can impersonate other users to verify what they see. While impersonating, the UI respects the impersonated user's role — superuser-only actions and navigation items are hidden if the impersonated user is not a superuser."
    />

    <!-- Audit Trail -->
    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-clipboard-list"
      title="Audit Trail"
      description="All create, update, and delete operations are recorded in the audit log with the user ID, operation type, affected entity, changed fields, and timestamp. The audit log is viewable by authenticated users at /audit."
    />
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

// --- Roles ---

const roles = [
  {
    icon: 'i-lucide-eye',
    title: 'Unauthenticated',
    description: 'Can browse read-only data: systems, components, technologies, teams, licenses, version constraints, violations, and approvals.',
  },
  {
    icon: 'i-lucide-user',
    title: 'Authenticated (User)',
    description: 'Can create and manage systems, technologies, version constraints, and submit SBOMs. Can view audit logs and their own profile.',
  },
  {
    icon: 'i-lucide-shield-alert',
    title: 'Superuser',
    description: 'Full administrative access. Can manage teams, users, API tokens, license allow/deny lists, impersonation, and GitHub imports.',
  },
]

// --- Superuser-only pages ---

const superuserPages = [
  { icon: 'i-lucide-user-cog', title: 'Users', description: 'User list and user detail pages, including technical user creation and API token management.' },
  { icon: 'i-lucide-eye', title: 'Impersonate User', description: 'View the application as another user to verify access controls.' },
  { icon: 'i-lucide-scale', title: 'License Allow/Deny', description: 'Manage the organization license whitelist and deny list.' },
  { icon: 'i-lucide-github', title: 'Import from GitHub', description: 'Import a system from a GitHub repository on the Systems page.' },
  { icon: 'i-lucide-users', title: 'Team management', description: 'Create, edit, and delete teams on the Teams page.' },
]

// --- Access table ---

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

const UBadgeComponent = resolveComponent('UBadge')

function badgeCell(value: string) {
  if (value === '—') return h('span', { class: 'text-(--ui-text-muted)' }, '—')
  return h(UBadgeComponent, { color: badgeColor(value), variant: 'subtle', size: 'xs' }, () => value)
}

const accessColumns: TableColumn<typeof accessRows[0]>[] = [
  { accessorKey: 'element', header: 'Element', cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('element') as string) },
  { accessorKey: 'view', header: 'View', cell: ({ row }) => badgeCell(row.getValue('view') as string) },
  { accessorKey: 'create', header: 'Create', cell: ({ row }) => badgeCell(row.getValue('create') as string) },
  { accessorKey: 'edit', header: 'Edit', cell: ({ row }) => badgeCell(row.getValue('edit') as string) },
  { accessorKey: 'delete', header: 'Delete', cell: ({ row }) => badgeCell(row.getValue('delete') as string) },
  { accessorKey: 'notes', header: 'Notes', cell: ({ row }) => h('span', { class: 'text-(--ui-text-muted) text-xs' }, row.getValue('notes') as string) },
]

const accessRows = [
  { element: 'Systems', view: 'Public', create: 'Authenticated', edit: 'Owner team*', delete: 'Owner team*', notes: '* Superusers or members of the system\'s owner team' },
  { element: 'Repositories', view: 'Public', create: 'Authenticated', edit: '—', delete: '—', notes: 'Added to systems; viewed as part of system detail' },
  { element: 'Components', view: 'Public', create: '—', edit: '—', delete: '—', notes: 'Created only via SBOM ingestion, never directly' },
  { element: 'Technologies', view: 'Public', create: 'Authenticated', edit: '—', delete: 'Owner team*', notes: '* Superusers or members of the technology\'s steward team' },
  { element: 'Teams', view: 'Public', create: 'Superuser', edit: 'Superuser', delete: 'Superuser', notes: 'Full team management is superuser-only' },
  { element: 'Users', view: 'Superuser', create: 'Superuser', edit: '—', delete: 'Superuser', notes: 'Technical users only; OAuth users are created on sign-in' },
  { element: 'API Tokens', view: 'Superuser', create: 'Superuser', edit: '—', delete: 'Superuser', notes: 'Managed per technical user; token value shown once' },
  { element: 'Version Constraints', view: 'Public', create: 'Authenticated', edit: 'Creator*', delete: 'Creator*', notes: '* Superusers or the user who created the version constraint' },
  { element: 'Licenses', view: 'Public', create: '—', edit: '—', delete: '—', notes: 'Discovered via SBOM ingestion; not directly managed' },
  { element: 'License Allow/Deny', view: 'Authenticated', create: 'Superuser', edit: 'Superuser', delete: 'Superuser', notes: 'Superusers manage the organization license whitelist' },
  { element: 'Violations', view: 'Authenticated', create: '—', edit: '—', delete: '—', notes: 'Compliance and version constraint violations; read-only for authenticated users' },
  { element: 'Approvals', view: 'Public', create: 'Authenticated', edit: '—', delete: '—', notes: 'Team members approve technologies for their team' },
  { element: 'SBOMs', view: '—', create: 'Authenticated', edit: '—', delete: '—', notes: 'Submitted via API; creates/updates components and licenses' },
  { element: 'Audit Logs', view: 'Authenticated', create: '—', edit: '—', delete: '—', notes: 'Automatically generated; read-only' },
  { element: 'GitHub Import', view: '—', create: 'Superuser', edit: '—', delete: '—', notes: 'Creates a system from a GitHub repo without cloning' },
  { element: 'Impersonation', view: 'Superuser', create: 'Superuser', edit: '—', delete: 'Superuser', notes: 'Start/stop impersonation of other users' },
]

// --- Creation table ---

const creationColumns: TableColumn<typeof creationRows[0]>[] = [
  { accessorKey: 'element', header: 'Element', cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('element') as string) },
  { accessorKey: 'method', header: 'Creation Method' },
]

const creationRows = [
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
  { element: 'Audit Logs', method: 'Generated automatically on every create, update, and delete operation' },
]

useHead({ title: 'Access Model - Polaris' })
</script>
