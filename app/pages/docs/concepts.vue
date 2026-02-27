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
        <p>Technology types use the <a href="https://cyclonedx.org/docs/1.6/json/#components_items_type" target="_blank">CycloneDX ComponentType</a> values:</p>
        <ol>
          <li><strong>application</strong> — Standalone software applications (e.g., Keycloak, Grafana)</li>
          <li><strong>framework</strong> — Application frameworks (e.g., React, Vue, Spring Boot, Express)</li>
          <li><strong>library</strong> — Reusable code libraries (e.g., Lodash, TypeScript)</li>
          <li><strong>container</strong> — Container runtimes and images (e.g., Docker)</li>
          <li><strong>platform</strong> — Runtimes, databases, and infrastructure platforms (e.g., Node.js, PostgreSQL, Redis, Kubernetes)</li>
          <li><strong>operating-system</strong> — Operating systems (e.g., Alpine Linux, Ubuntu)</li>
          <li><strong>device</strong> — Hardware devices</li>
          <li><strong>device-driver</strong> — Device drivers</li>
          <li><strong>firmware</strong> — Firmware</li>
          <li><strong>file</strong> — Standalone files</li>
          <li><strong>machine-learning-model</strong> — ML models</li>
          <li><strong>data</strong> — Data assets</li>
        </ol>

        <h3>Technology Domains</h3>
        <p>Domains classify technologies by the architectural concern they serve:</p>
        <ol>
          <li><strong>foundational-runtime</strong> — Core execution environments (e.g., Node.js, JVM, .NET, Python)</li>
          <li><strong>framework</strong> — Application frameworks (e.g., React, Vue, Spring Boot, Express)</li>
          <li><strong>data-platform</strong> — Databases and data storage (e.g., PostgreSQL, Neo4j, Redis, MongoDB)</li>
          <li><strong>integration-platform</strong> — Messaging and integration (e.g., Kafka, RabbitMQ, GraphQL, gRPC)</li>
          <li><strong>security-identity</strong> — Authentication, authorization, and security (e.g., OAuth2, Keycloak, Vault)</li>
          <li><strong>infrastructure</strong> — Deployment and infrastructure (e.g., Docker, Kubernetes, Terraform)</li>
          <li><strong>observability</strong> — Monitoring and observability (e.g., Prometheus, Grafana, OpenTelemetry)</li>
          <li><strong>developer-tooling</strong> — Build tools, linters, and dev utilities (e.g., ESLint, Webpack, TypeScript)</li>
          <li><strong>other</strong> — Technologies that don't fit other domains</li>
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
