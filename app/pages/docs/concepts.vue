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
          description="A Technology is confirmed from a Component that SBOM scanning actually discovered in your systems — it can never exist without that evidence. A Platform is the deliberate exception: infrastructure and services (databases, cloud platforms) that SBOM scanning can never observe, declared manually by a superuser instead. Polaris uses this discovery-first model to keep governance grounded in what's actually running, not just what's been typed into a form."
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

    <!-- Platform -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-server" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Platform</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          A <strong>Platform</strong> is the deliberate exception to Technology's evidence requirement: infrastructure and services that SBOM scanning can never observe from a source repository, no matter how real their usage is.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageFeature
            v-for="char in platformCharacteristics"
            :key="char.title"
            :icon="char.icon"
            :title="char.title"
            :description="char.description"
            orientation="horizontal"
          />
        </div>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Why superuser-only?"
          description="Platform is the one place a governance record can exist without evidence behind it. Restricting creation to superusers keeps that exception rare and deliberate, rather than becoming a backdoor around the Technology catalog's evidence requirement."
        />
      </div>
    </UCard>

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
          Each team independently assigns a TIME category (Tolerate, Invest, Migrate, Eliminate) to the technologies it uses. Compliance violations are detected when a component appears in an SBOM without a corresponding team approval, or when the assigned category is Eliminate.
        </p>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-off"
          title="No approval defaults to Eliminate"
          description="These aren't just two cases that happen to produce the same violation — internally they're the same value. A technology with no recorded team approval is treated exactly as Eliminate; there is no separate unreviewed or pending state. Where a team has approved a specific version of a technology, that version-level approval takes precedence over whatever the team approved at the technology level."
        />
        <div>
          <p class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wide mb-3">How it works</p>
          <UTimeline :items="approvalWorkflowSteps" />
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

    <!-- Technology Radar -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-radar" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Technology Radar</h2>
        </div>
      </template>
      <div class="space-y-6">
        <p class="text-(--ui-text-muted)">
          The Technology Radar aggregates every team's individual TIME approval for a technology into a single, organization-wide consensus view — a majority vote across all teams that have recorded a stance.
        </p>
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-scale"
          title="Tie-break order"
          description="When teams are evenly split, the Radar resolves the tie by favoring the more cautious category: Eliminate outranks Migrate, which outranks Tolerate, which outranks Invest. A tied vote never resolves toward the more permissive stance."
        />
      </div>
    </UCard>

    <!-- Version Sprawl -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-git-fork" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">Version Sprawl</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">
          Version sprawl detection flags components in use at too many distinct versions across the organization at once — a signal that a technology has drifted out of consistent, centrally-governed use.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UPageFeature
            v-for="fact in versionSprawlFacts"
            :key="fact.title"
            :icon="fact.icon"
            :title="fact.title"
            :description="fact.description"
            orientation="horizontal"
          />
        </div>
      </div>
    </UCard>

    <!-- License Compliance -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-scale" class="w-5 h-5 text-(--ui-primary)" />
          <h2 class="text-lg font-semibold">License Compliance</h2>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-(--ui-text-muted)">
          Every license discovered through SBOM ingestion is checked against an organization-managed allow list, maintained by superusers.
        </p>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-off"
          title="No review defaults to not allowed"
          description="A license with no explicit allowed/denied decision recorded is treated as not allowed — the same outcome as one a superuser has actively reviewed and denied. There is no neutral or unreviewed state, the same default-deny posture used for TIME approvals above."
        />
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-list-checks"
          title="Bulk updates are all-or-nothing"
          description="Approving or denying many licenses at once is transactional: if any license in the batch doesn't exist, the entire update is rejected and none of the valid ones are applied."
        />
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
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Failures and sensitive reads are audited too"
          description="A failed governance operation — for example a rejected technology creation — still produces an audit entry, not just successful ones. Certain sensitive reads, such as viewing the full user list as an admin, are logged as well, even though nothing was changed. Audit writes are best-effort: if writing the audit entry itself fails, the operation it was recording still completes — auditability never blocks or breaks the action it documents."
        />
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
          description="The audit log is accessible to all authenticated users. Navigate to /audit to view the full history of governance decisions."
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
  { icon: 'i-lucide-clock', title: 'Lifecycle managed', description: 'Tracked through the TIME framework (Tolerate, Invest, Migrate, Eliminate)' },
  { icon: 'i-lucide-link', title: 'Requires a component', description: 'Can only be created by claiming at least one discovered, unlinked software component — never created from scratch' },
]

// This same type/domain vocabulary is shared by Technology and Platform — it
// describes a technology's category/shape, which is orthogonal to how it was
// discovered. Examples below are split accordingly: Technology examples are
// real npm/Maven/etc. packages a SBOM scan can surface; Platform examples are
// infrastructure/services that can't be, however they're categorized.
const technologyTypes = [
  { name: 'application', description: 'Standalone software applications (e.g., a packaged CLI tool)' },
  { name: 'framework', description: 'Application frameworks (e.g., React, Vue, Express)' },
  { name: 'library', description: 'Reusable code libraries (e.g., Lodash, TypeScript)' },
  { name: 'container', description: 'Container runtimes and images — almost always a Platform (e.g., Docker)' },
  { name: 'platform', description: 'Runtimes and infrastructure platforms — almost always a Platform, not a Technology (e.g., Node.js, PostgreSQL, Redis, Kubernetes)' },
  { name: 'operating-system', description: 'Operating systems — a Platform unless a container/OS image scan genuinely surfaces it as a Component (e.g., Alpine Linux, Ubuntu)' },
  { name: 'device', description: 'Hardware devices' },
  { name: 'device-driver', description: 'Device drivers' },
  { name: 'firmware', description: 'Firmware' },
  { name: 'file', description: 'Standalone files' },
  { name: 'machine-learning-model', description: 'ML models' },
  { name: 'data', description: 'Data assets' },
]

const technologyDomains = [
  { name: 'foundational-runtime', description: 'Core execution environments — almost always a Platform (e.g., Node.js, JVM, .NET, Python)' },
  { name: 'framework', description: 'Application frameworks (e.g., React, Vue, Express)' },
  { name: 'data-platform', description: 'Databases and data storage — almost always a Platform (e.g., PostgreSQL, Neo4j, Redis, MongoDB)' },
  { name: 'integration-platform', description: 'Messaging and integration — often a Platform (e.g., Kafka, RabbitMQ), though a client library like a gRPC codegen package can be a real Technology' },
  { name: 'security-identity', description: 'Authentication, authorization, and security (e.g., an OAuth2 client library as Technology; Keycloak or Vault as Platform)' },
  { name: 'infrastructure', description: 'Deployment and infrastructure — almost always a Platform (e.g., Docker, Kubernetes, Terraform)' },
  { name: 'observability', description: 'Monitoring and observability (e.g., an OpenTelemetry SDK as Technology; Prometheus or Grafana as Platform)' },
  { name: 'developer-tooling', description: 'Build tools, linters, and dev utilities — usually real Technology, since these are typically real dependencies (e.g., ESLint, Webpack, TypeScript)' },
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

const platformCharacteristics = [
  { icon: 'i-lucide-shield-off', title: 'No evidence required', description: 'Unlike Technology, never needs a linked Component — that is the entire point of the entity' },
  { icon: 'i-lucide-user-cog', title: 'Superuser-only creation', description: 'The deliberate, narrow exception to evidence-based governance' },
  { icon: 'i-lucide-users', title: 'Same stewardship model', description: 'One team stewards each Platform, same as Technology' },
  { icon: 'i-lucide-clock', title: 'Same TIME framework', description: 'Tracked through Tolerate, Invest, Migrate, Eliminate, same as Technology' },
  { icon: 'i-lucide-database', title: 'Typical examples', description: 'Databases, cloud services, container runtimes — PostgreSQL, MongoDB, Docker' },
  { icon: 'i-lucide-ban', title: 'No version tracking yet', description: 'Version/EOL tracking for Platforms is not yet built — a known gap, not an oversight' },
]

const comparisonRows = [
  { aspect: 'Definition', technology: 'Governed strategic choice', component: 'Actual software artifact in use' },
  { aspect: 'Governance', technology: 'Requires approval and oversight', component: 'Tracked for compliance' },
  { aspect: 'Scope', technology: 'Enterprise-wide decision', component: 'System-specific dependency' },
  { aspect: 'Discovery', technology: 'Confirmed by architecture teams from a Component that SBOM scanning already discovered', component: 'Discovered through SBOM scanning' },
  { aspect: 'Examples', technology: '"React" (framework choice)', component: '"react@18.2.0" (npm package)' },
  { aspect: 'Lifecycle', technology: 'Managed through version constraints', component: 'Discovered and monitored' },
  { aspect: 'Relationship', technology: 'One-to-many with Components (at least one required)', component: 'Optional many-to-one with Technology' },
]

const workflowSteps: TimelineItem[] = [
  { icon: 'i-lucide-code', title: 'Implementation', description: 'Developers add a real dependency to a project (e.g., react@18.2.0)' },
  { icon: 'i-lucide-scan', title: 'Discovery', description: 'SBOM scanning discovers the Component in a System, initially unlinked to any Technology' },
  { icon: 'i-lucide-link', title: 'Confirmation', description: 'A superuser confirms the unlinked Component from the Component Link Queue, creating the Technology (e.g., React) from it' },
  { icon: 'i-lucide-check-circle', title: 'Team Approval', description: 'Individual teams set a TIME category for the now-evidence-backed Technology' },
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
  { icon: 'i-lucide-search', title: 'Identify', description: 'A team identifies a technology it uses or plans to use' },
  { icon: 'i-lucide-tag', title: 'Categorise', description: 'A team member or superuser sets the TIME category for that technology' },
  { icon: 'i-lucide-shield-check', title: 'Compliance checked', description: 'SBOMs are scanned; components without a team approval, or with an Eliminate category, are flagged as violations' },
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

const versionSprawlFacts = [
  { icon: 'i-lucide-link', title: 'Direct usage only', description: 'Only versions a System depends on directly count toward sprawl — versions that appear solely as transitive dependencies are excluded' },
  { icon: 'i-lucide-hash', title: 'Minimum version count', description: 'A component must be in use at a minimum number of distinct versions across the organization before it is flagged at all' },
  { icon: 'i-lucide-alert-triangle', title: 'EOL-weighted severity', description: 'Sprawl is scored by severity, weighted more heavily when one or more of the versions in use is past end-of-life' },
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
