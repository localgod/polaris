<template>
  <div class="space-y-6">
    <UPageHeader
      title="Core Concepts"
      description="Understanding Technologies vs Components in Polaris"
    />

    <UCard>
      <div>
        <h2>Overview</h2>
        <p>Polaris distinguishes between <strong>Technologies</strong> (governed strategic choices) and <strong>Components</strong> (actual software artifacts in use).</p>

        <h2>Technology</h2>
        <p>A <strong>Technology</strong> is a governed software entity that requires architectural approval, lifecycle management, and version constraint compliance.</p>
        <h3>Characteristics</h3>
        <ul>
          <li>Strategic architectural decision with long-term impact</li>
          <li>Requires approval through governance processes</li>
          <li>Subject to enterprise version constraints and standards</li>
          <li>Managed through TIME framework (invest, migrate, tolerate, eliminate)</li>
          <li>Has version constraints and security oversight</li>
          <li>One team stewards each technology</li>
        </ul>

        <h3>Technology Types</h3>
        <ol>
          <li><strong>Foundational Runtime or Framework</strong> — Core execution environments and application frameworks (e.g., Node.js, React, Vue, Spring Boot)</li>
          <li><strong>Data Platform</strong> — Database systems and data storage (e.g., PostgreSQL, MongoDB, Neo4j, Redis)</li>
          <li><strong>Integration Platform</strong> — Middleware and integration technologies (e.g., Kafka, RabbitMQ, GraphQL)</li>
          <li><strong>Security or Identity Tech</strong> — Authentication, authorization, and security tools (e.g., OAuth2, Keycloak, Vault)</li>
          <li><strong>Infrastructure / Container Tech</strong> — Deployment and infrastructure (e.g., Docker, Kubernetes, Terraform)</li>
          <li><strong>Explicitly Disallowed or Deprecated</strong> — Technologies that are banned or being phased out</li>
        </ol>

        <h2>Component</h2>
        <p>A <strong>Component</strong> is a software artifact discovered in systems through SBOM (Software Bill of Materials) scanning.</p>
        <h3>Characteristics</h3>
        <ul>
          <li>Concrete software package or dependency</li>
          <li>Discovered through automated scanning</li>
          <li>May or may not map to a governed Technology</li>
          <li>Includes transitive dependencies</li>
          <li>Tracked for compliance, security, and licensing</li>
          <li>Used in one or more systems</li>
        </ul>

        <h2>Technology vs Component</h2>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Technology</th>
              <th>Component</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Definition</td>
              <td>Governed strategic choice</td>
              <td>Actual software artifact in use</td>
            </tr>
            <tr>
              <td>Governance</td>
              <td>Requires approval and oversight</td>
              <td>Tracked for compliance</td>
            </tr>
            <tr>
              <td>Scope</td>
              <td>Enterprise-wide decision</td>
              <td>System-specific dependency</td>
            </tr>
            <tr>
              <td>Discovery</td>
              <td>Defined by architecture teams</td>
              <td>Discovered through SBOM scanning</td>
            </tr>
            <tr>
              <td>Examples</td>
              <td>"React" (framework choice)</td>
              <td>"react@18.2.0" (npm package)</td>
            </tr>
            <tr>
              <td>Lifecycle</td>
              <td>Managed through version constraints</td>
              <td>Discovered and monitored</td>
            </tr>
            <tr>
              <td>Relationship</td>
              <td>One-to-many with Components</td>
              <td>Optional many-to-one with Technology</td>
            </tr>
          </tbody>
        </table>

        <h2>Workflow</h2>
        <ol>
          <li><strong>Governance Decision</strong> — Architecture team approves a Technology (e.g., React)</li>
          <li><strong>Team Approval</strong> — Individual teams approve the Technology for their use</li>
          <li><strong>Implementation</strong> — Developers use Components that implement that Technology (e.g., react@18.2.0)</li>
          <li><strong>Discovery</strong> — SBOM scanning discovers Components in Systems</li>
          <li><strong>Compliance Check</strong> — Components are validated against approved Technologies</li>
          <li><strong>Violation Detection</strong> — Components without corresponding Technology approval are flagged</li>
        </ol>

        <h2>Key Takeaways</h2>
        <ul>
          <li><strong>Technologies are strategic decisions</strong> — They require governance approval and have enterprise-wide impact</li>
          <li><strong>Components are implementation details</strong> — They are discovered through scanning and tracked for compliance</li>
          <li><strong>Not all components map to technologies</strong> — Transitive dependencies may not require governance</li>
          <li><strong>Compliance is automatic</strong> — The system validates components against approved technologies</li>
          <li><strong>Violations are actionable</strong> — Teams must either approve the technology or stop using it</li>
        </ul>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Core Concepts - Polaris'
})
</script>
