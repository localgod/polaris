<template>
  <div class="space-y-6">
    <UPageHeader
      title="Core Concepts"
      description="Understanding how Polaris manages technology governance"
    />

    <!-- Overview -->
    <UCard>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">
          Polaris is an enterprise technology catalog that helps organizations govern which software technologies are approved for use, track what is actually running in their systems, and ensure compliance between the two.
        </p>
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Core distinction"
          description="Technologies are governed strategic choices approved by architecture teams. Components are actual software artifacts discovered in your systems through SBOM scanning. Polaris connects the two to surface compliance gaps."
        />
      </div>
    </UCard>

    <!-- Technology -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-settings" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Technology</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          A <strong>Technology</strong> is a governed software entity that requires architectural approval, lifecycle management, and version constraint compliance.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageFeature
            v-for="char in technologyCharacteristics"
            :key="char.title"
            :icon="char.icon"
            :title="char.title"
            :description="char.description"
            orientation="horizontal"
          />
        </div>
        <UAccordion :items="technologyAccordionItems" type="multiple">
          <template #types>
            <div class="space-y-2 pb-2">
              <div v-for="type in technologyTypes" :key="type.name" class="flex items-start gap-3">
                <UBadge :label="type.name" variant="subtle" color="neutral" class="shrink-0 mt-0.5" />
                <span class="text-sm text-(--ui-text-muted)">{{ type.description }}</span>
              </div>
            </div>
          </template>
          <template #domains>
            <div class="space-y-2 pb-2">
              <div v-for="domain in technologyDomains" :key="domain.name" class="flex items-start gap-3">
                <UBadge :label="domain.name" variant="subtle" color="neutral" class="shrink-0 mt-0.5" />
                <span class="text-sm text-(--ui-text-muted)">{{ domain.description }}</span>
              </div>
            </div>
          </template>
        </UAccordion>
      </div>
    </UCard>

    <!-- Component -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-box" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Component</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">
          A <strong>Component</strong> is a software artifact discovered in systems through SBOM (Software Bill of Materials) scanning.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageFeature
            v-for="char in componentCharacteristics"
            :key="char.title"
            :icon="char.icon"
            :title="char.title"
            :description="char.description"
            orientation="horizontal"
          />
        </div>
      </div>
    </UCard>

    <!-- Technology vs Component -->
    <div class="space-y-3">
      <div class="flex items-center gap-2 px-1">
        <UIcon name="i-lucide-git-compare" class="w-5 h-5 text-(--ui-text-muted)" />
        <h2 class="text-lg font-semibold">Technology vs Component</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-settings" class="w-4 h-4 text-(--ui-primary)" />
              <span class="font-semibold">Technology</span>
            </div>
          </template>
          <div class="space-y-4">
            <UPageFeature
              v-for="row in comparisonRows"
              :key="row.aspect + '-tech'"
              icon="i-lucide-check"
              :title="row.aspect"
              :description="row.technology"
              orientation="horizontal"
            />
          </div>
        </UCard>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-box" class="w-4 h-4 text-(--ui-primary)" />
              <span class="font-semibold">Component</span>
            </div>
          </template>
          <div class="space-y-4">
            <UPageFeature
              v-for="row in comparisonRows"
              :key="row.aspect + '-comp'"
              icon="i-lucide-check"
              :title="row.aspect"
              :description="row.component"
              orientation="horizontal"
            />
          </div>
        </UCard>
      </div>
    </div>

    <!-- How Polaris Works -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-workflow" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">How Polaris Works</h2>
        </div>
      </template>
      <UTimeline :items="workflowSteps" />
    </UCard>

    <!-- TIME Framework -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">TIME Framework</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          The TIME framework categorizes technologies based on their lifecycle stage and organizational adoption strategy.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageFeature
            v-for="cat in timeCategories"
            :key="cat.title"
            :icon="cat.icon"
            :title="cat.title"
            :description="cat.description"
            orientation="horizontal"
          />
        </div>
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-lightbulb"
          title="Usage in Polaris"
          description="Each technology can be assigned a TIME classification to help teams understand whether to adopt it for new projects, the urgency of migration efforts, and how resources should be allocated."
        />
      </div>
    </UCard>

    <!-- Team Approvals -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Team Approvals</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          Team approvals allow organizations to control which technologies teams can use, ensuring compliance with organizational standards while giving teams flexibility within approved boundaries.
        </p>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Approval Workflow</p>
          <UTimeline :items="approvalWorkflowSteps" />
        </div>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Approval Levels</p>
          <div class="space-y-3">
            <UPageFeature
              v-for="level in approvalLevels"
              :key="level.title"
              :icon="level.icon"
              :title="level.title"
              :description="level.description"
              orientation="horizontal"
            />
          </div>
        </div>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Stewardship</p>
          <p class="text-sm text-(--ui-text-muted) mb-3">Each technology has designated stewards responsible for:</p>
          <div class="space-y-3">
            <UPageFeature
              v-for="duty in stewardshipDuties"
              :key="duty.title"
              :icon="duty.icon"
              :title="duty.title"
              :description="duty.description"
              orientation="horizontal"
            />
          </div>
        </div>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Why Team Ownership?</p>
          <div class="space-y-3">
            <UPageFeature
              v-for="reason in teamOwnershipReasons"
              :key="reason.title"
              :icon="reason.icon"
              :title="reason.title"
              :description="reason.description"
              orientation="horizontal"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Audit Trail -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clipboard-list" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Audit Trail</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          The audit trail captures governance decisions — changes to version constraints, approvals, team structure, and system ownership. Operational data that changes frequently through automated processes (components discovered via SBOM, repositories) is excluded.
        </p>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Governance Operations</p>
          <div class="space-y-3">
            <UPageFeature
              v-for="event in auditGovernanceEvents"
              :key="event.title"
              :icon="event.icon"
              :title="event.title"
              :description="event.description"
              orientation="horizontal"
            />
          </div>
        </div>
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">Relationship Changes</p>
          <div class="space-y-3">
            <UPageFeature
              v-for="event in auditRelationshipEvents"
              :key="event.title"
              :icon="event.icon"
              :title="event.title"
              :description="event.description"
              orientation="horizontal"
            />
          </div>
        </div>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield"
          title="Access"
          description="The audit log is only accessible to superusers. Navigate to /audit to view the full history of governance decisions."
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { AccordionItem, TimelineItem } from '@nuxt/ui'

const technologyCharacteristics = [
  { icon: 'i-lucide-building-2', title: 'Strategic decision', description: 'Enterprise-wide architectural choice with long-term impact' },
  { icon: 'i-lucide-shield-check', title: 'Requires approval', description: 'Must go through governance processes before adoption' },
  { icon: 'i-lucide-git-branch', title: 'Version constraints', description: 'Subject to enterprise version standards and security oversight' },
  { icon: 'i-lucide-users', title: 'Team stewardship', description: 'One team is responsible for each technology' },
  { icon: 'i-lucide-clock', title: 'Lifecycle managed', description: 'Tracked through the TIME framework (Invest, Migrate, Tolerate, Eliminate)' },
  { icon: 'i-lucide-link', title: 'Linked to components', description: 'Maps to one or many discovered software components' },
]

const technologyTypes = [
  { name: 'application', description: 'Standalone software applications (e.g., Keycloak, Grafana)' },
  { name: 'framework', description: 'Application frameworks (e.g., React, Vue, Spring Boot, Express)' },
  { name: 'library', description: 'Reusable code libraries (e.g., Lodash, TypeScript)' },
  { name: 'container', description: 'Container runtimes and images (e.g., Docker)' },
  { name: 'platform', description: 'Runtimes, databases, and infrastructure platforms (e.g., Node.js, PostgreSQL, Redis, Kubernetes)' },
  { name: 'operating-system', description: 'Operating systems (e.g., Alpine Linux, Ubuntu)' },
  { name: 'device', description: 'Hardware devices' },
  { name: 'device-driver', description: 'Device drivers' },
  { name: 'firmware', description: 'Firmware' },
  { name: 'file', description: 'Standalone files' },
  { name: 'machine-learning-model', description: 'ML models' },
  { name: 'data', description: 'Data assets' },
]

const technologyDomains = [
  { name: 'foundational-runtime', description: 'Core execution environments (e.g., Node.js, JVM, .NET, Python)' },
  { name: 'framework', description: 'Application frameworks (e.g., React, Vue, Spring Boot, Express)' },
  { name: 'data-platform', description: 'Databases and data storage (e.g., PostgreSQL, Neo4j, Redis, MongoDB)' },
  { name: 'integration-platform', description: 'Messaging and integration (e.g., Kafka, RabbitMQ, GraphQL, gRPC)' },
  { name: 'security-identity', description: 'Authentication, authorization, and security (e.g., OAuth2, Keycloak, Vault)' },
  { name: 'infrastructure', description: 'Deployment and infrastructure (e.g., Docker, Kubernetes, Terraform)' },
  { name: 'observability', description: 'Monitoring and observability (e.g., Prometheus, Grafana, OpenTelemetry)' },
  { name: 'developer-tooling', description: 'Build tools, linters, and dev utilities (e.g., ESLint, Webpack, TypeScript)' },
  { name: 'other', description: "Technologies that don't fit other domains" },
]

const technologyAccordionItems: AccordionItem[] = [
  { label: 'Technology Types', icon: 'i-lucide-tag', slot: 'types' },
  { label: 'Technology Domains', icon: 'i-lucide-layers', slot: 'domains' },
]

const componentCharacteristics = [
  { icon: 'i-lucide-package', title: 'Concrete artifact', description: 'An actual software package or dependency in use' },
  { icon: 'i-lucide-scan', title: 'Discovered automatically', description: 'Found through SBOM scanning, not manually defined' },
  { icon: 'i-lucide-git-merge', title: 'Includes transitive deps', description: 'Captures the full dependency tree, not just direct dependencies' },
  { icon: 'i-lucide-shield', title: 'Compliance tracked', description: 'Monitored for compliance, security, and licensing' },
  { icon: 'i-lucide-link-2', title: 'Optional technology link', description: 'May or may not map to a governed Technology' },
  { icon: 'i-lucide-server', title: 'System-specific', description: 'Used in one or more systems across the organization' },
]

const comparisonRows = [
  { aspect: 'Definition', technology: 'Governed strategic choice', component: 'Actual software artifact in use' },
  { aspect: 'Governance', technology: 'Requires approval and oversight', component: 'Tracked for compliance' },
  { aspect: 'Scope', technology: 'Enterprise-wide decision', component: 'System-specific dependency' },
  { aspect: 'Discovery', technology: 'Defined by architecture teams', component: 'Discovered through SBOM scanning' },
  { aspect: 'Examples', technology: '"React" (framework choice)', component: '"react@18.2.0" (npm package)' },
  { aspect: 'Lifecycle', technology: 'Managed through version constraints', component: 'Discovered and monitored' },
  { aspect: 'Relationship', technology: 'One-to-many with Components', component: 'Optional many-to-one with Technology' },
]

const workflowSteps: TimelineItem[] = [
  { icon: 'i-lucide-building-2', title: 'Governance Decision', description: 'Architecture team approves a Technology (e.g., React)' },
  { icon: 'i-lucide-check-circle', title: 'Team Approval', description: 'Individual teams approve the Technology for their use' },
  { icon: 'i-lucide-code', title: 'Implementation', description: 'Developers use Components that implement that Technology (e.g., react@18.2.0)' },
  { icon: 'i-lucide-scan', title: 'Discovery', description: 'SBOM scanning discovers Components in Systems' },
  { icon: 'i-lucide-shield-check', title: 'Compliance Check', description: 'Components are validated against approved Technologies' },
  { icon: 'i-lucide-alert-triangle', title: 'Violation Detection', description: 'Components without corresponding Technology approval are flagged' },
]

const timeCategories = [
  { icon: 'i-lucide-trending-up', title: 'Invest', description: 'Strategic technologies receiving active investment. Recommended for new projects.' },
  { icon: 'i-lucide-pause-circle', title: 'Tolerate', description: 'Legacy technologies being phased out. No new projects should use these.' },
  { icon: 'i-lucide-arrow-right-circle', title: 'Migrate', description: 'Technologies being actively replaced. Existing usage should be transitioned.' },
  { icon: 'i-lucide-x-circle', title: 'Eliminate', description: 'Technologies that must be removed due to security, compliance, or strategic reasons.' },
]

const approvalWorkflowSteps: TimelineItem[] = [
  { icon: 'i-lucide-send', title: 'Request', description: 'Team requests approval to use a technology' },
  { icon: 'i-lucide-eye', title: 'Review', description: 'Technology stewards review the request' },
  { icon: 'i-lucide-gavel', title: 'Decision', description: 'Request is approved, denied, or requires changes' },
  { icon: 'i-lucide-rocket', title: 'Implementation', description: 'Approved technologies can be used by the team' },
]

const approvalLevels = [
  { icon: 'i-lucide-globe', title: 'Organization-wide', description: 'Approved for all teams automatically' },
  { icon: 'i-lucide-users', title: 'Team-specific', description: 'Approved only for the requesting team' },
  { icon: 'i-lucide-sliders', title: 'Conditional', description: 'Approved with specific constraints or version requirements' },
]

const stewardshipDuties = [
  { icon: 'i-lucide-clipboard-check', title: 'Review requests', description: 'Evaluate and respond to team approval requests' },
  { icon: 'i-lucide-book-open', title: 'Maintain documentation', description: 'Keep technology documentation current and accurate' },
  { icon: 'i-lucide-bell', title: 'Communicate updates', description: 'Notify teams of updates, deprecations, and changes' },
  { icon: 'i-lucide-life-buoy', title: 'Support teams', description: 'Help teams using the technology with questions and issues' },
]

const teamOwnershipReasons = [
  { icon: 'i-lucide-refresh-cw', title: 'Continuity', description: 'People change roles and leave organizations. Team-level stewardship survives personnel changes without manual reassignment.' },
  { icon: 'i-lucide-users-2', title: 'Shared accountability', description: 'Technology decisions benefit from collective judgment. Team ownership distributes responsibility across multiple people rather than creating a single point of failure.' },
]

const auditGovernanceEvents = [
  { icon: 'i-lucide-git-branch', title: 'Version constraint lifecycle', description: 'Creation, activation, deactivation, archiving, and deletion of version constraints' },
  { icon: 'i-lucide-scale', title: 'License decisions', description: 'Allowing or denying licenses, and enabling or disabling the license whitelist' },
  { icon: 'i-lucide-check-circle', title: 'Technology approvals', description: 'TIME framework categorization, version-specific approvals, and revocations' },
]

const auditRelationshipEvents = [
  { icon: 'i-lucide-user-plus', title: 'Team membership', description: 'Adding and removing team members' },
  { icon: 'i-lucide-link', title: 'Ownership changes', description: 'System ownership and technology stewardship assignments' },
  { icon: 'i-lucide-shield', title: 'Constraint enforcement', description: 'Changes to which teams a version constraint applies to' },
]

useHead({ title: 'Core Concepts - Polaris' })
</script>
