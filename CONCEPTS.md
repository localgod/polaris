# Polaris Concepts: Technologies vs Components

## Overview

Polaris distinguishes between **Technologies** (governed strategic choices) and **Components** (actual software artifacts in use). This document clarifies these concepts and their relationship.

## Technology

### Definition

A **Technology** is a **governed software entity** that requires architectural approval, lifecycle management, and policy compliance.

### Characteristics

- Strategic architectural decision with long-term impact
- Requires approval through governance processes
- Subject to enterprise policies and standards
- Managed through TIME framework (invest, migrate, tolerate, eliminate)
- Has version constraints and security oversight
- One team stewards each technology

### Technology Types

1. **Foundational Runtime or Framework**
   - Core execution environments and application frameworks
   - Examples: Node.js, React, Vue, Angular, Spring Boot, Express
   - Impact: Defines application architecture and development patterns

2. **Data Platform**
   - Database systems and data storage technologies
   - Examples: PostgreSQL, MongoDB, Neo4j, Redis, Elasticsearch
   - Impact: Determines data architecture and persistence strategies

3. **Integration Platform**
   - Middleware and integration technologies
   - Examples: Kafka, RabbitMQ, API Gateway, GraphQL
   - Impact: Defines system integration patterns and data flow

4. **Security or Identity Tech**
   - Authentication, authorization, and security tools
   - Examples: OAuth2, Keycloak, Vault, LDAP
   - Impact: Determines security architecture and compliance

5. **Infrastructure / Container Tech**
   - Deployment and infrastructure technologies
   - Examples: Docker, Kubernetes, Terraform, AWS services
   - Impact: Defines deployment architecture and operational model

6. **Explicitly Disallowed or Deprecated**
   - Technologies that are banned or being phased out
   - Examples: jQuery (deprecated), Flash (disallowed), outdated frameworks
   - Impact: Prevents technical debt and security risks

### Example

```
Technology: React
- Type: Framework (Foundational)
- Vendor: Meta
- Status: Approved
- Approved Version Range: >=18.0.0 <19.0.0
- Stewarded By: Frontend Platform
- Risk Level: Low
```

## Component

### Component Definition

A **Component** is a **software artifact** discovered in systems through SBOM (Software Bill of Materials) scanning.

### Component Characteristics

- Concrete software package or dependency
- Discovered through automated scanning
- May or may not map to a governed Technology
- Includes transitive dependencies
- Tracked for compliance, security, and licensing
- Used in one or more systems

### Component vs Technology

| Aspect | Technology | Component |
|--------|-----------|-----------|
| **Definition** | Governed strategic choice | Actual software artifact in use |
| **Governance** | Requires approval and oversight | Tracked for compliance |
| **Scope** | Enterprise-wide decision | System-specific dependency |
| **Discovery** | Defined by architecture teams | Discovered through SBOM scanning |
| **Examples** | "React" (framework choice) | "react@18.2.0" (npm package) |
| **Lifecycle** | Managed through policies | Discovered and monitored |
| **Approval** | Requires team approval | Validated against approved technologies (if mapped) |
| **Relationship** | One-to-many with Components | Optional many-to-one with Technology |

### Component Example

```
Component: react@18.2.0
- Package Manager: npm
- License: MIT
- Used In: Customer Portal, Admin Dashboard
- Maps To Technology: React (approved)
- Status: Compliant
```

## Relationship Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE LAYER                               │
│  ┌──────────────┐      ┌──────────────┐                            │
│  │ Technology   │      │ Technology   │                            │
│  │   React      │      │  PostgreSQL  │                            │
│  │ (Framework)  │      │  (Database)  │                            │
│  └──────┬───────┘      └──────┬───────┘                            │
│         │                     │                                     │
│    Governance                Governance                             │
│    Approval                  Approval                               │
│         │                     │                                     │
└─────────┼─────────────────────┼─────────────────────────────────────┘
          │                     │
          │ IS_VERSION_OF       │ IS_VERSION_OF
          │ (optional)          │ (optional)
          │                     │
┌─────────┼─────────────────────┼─────────────────────────────────────┐
│         │                     │           USAGE LAYER               │
│         ▼                     ▼                                     │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │
│  │ Component    │      │ Component    │      │ Component    │     │
│  │ react@18.2.0 │      │ pg@8.11.3    │      │loose-envify  │     │
│  │ (npm)        │      │ (npm)        │      │ @1.4.0 (npm) │     │
│  │ [Governed]   │      │ [Governed]   │      │ [Transitive] │     │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘     │
│         │                     │                     │               │
│         └──────────┬──────────┴─────────────────────┘               │
│                    │ USES                                           │
│                    ▼                                                │
│             ┌─────────────┐                                         │
│             │   System    │                                         │
│             │ API Gateway │                                         │
│             └─────────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘

Key:
- Governed Components: Have IS_VERSION_OF → Technology (subject to policies)
- Transitive Components: No Technology link (tracked for security only)
```

## Workflow

1. **Governance Decision**: Architecture team approves a Technology (e.g., React)
2. **Team Approval**: Individual teams approve the Technology for their use
3. **Implementation**: Developers use Components that implement that Technology (e.g., react@18.2.0)
4. **Discovery**: SBOM scanning discovers Components in Systems
5. **Compliance Check**: Components are validated against approved Technologies
6. **Violation Detection**: Components without corresponding Technology approval are flagged

## Scenarios

### Scenario 1: Compliant Usage ✅

```
Technology: React (approved by Frontend Platform)
Component: react@18.2.0 (used in Customer Portal)
Status: ✅ Compliant - Component version within approved range
```

### Scenario 2: Version Violation ⚠️

```
Technology: React (approved range: >=18.0.0 <19.0.0)
Component: react@17.0.2 (used in Legacy App)
Status: ⚠️ Warning - Component version outside approved range
```

### Scenario 3: Unapproved Technology ❌

```
Technology: jQuery (deprecated, not approved)
Component: jquery@3.6.0 (used in Admin Dashboard)
Status: ❌ Violation - Using deprecated technology without approval
```

### Scenario 4: Transitive Dependency ℹ️

```
Technology: N/A (not a governed technology)
Component: loose-envify@1.4.0 (transitive dependency of React)
Relationship: No IS_VERSION_OF relationship
Status: ℹ️ Tracked - Not subject to governance, but monitored for security and licensing
```

**Important Note:** Not all components map to technologies. Components can exist without an `IS_VERSION_OF` relationship when they are:
- Transitive dependencies (installed automatically by package managers)
- Utility libraries that don't require governance oversight
- Internal packages that aren't strategic architectural choices

These components are still tracked in the SBOM for security vulnerabilities and license compliance, but they don't trigger policy violations.

## Key Takeaways

1. **Technologies are strategic decisions** - They require governance approval and have enterprise-wide impact
2. **Components are implementation details** - They are discovered through scanning and tracked for compliance
3. **Not all components map to technologies** - Transitive dependencies may not require governance
4. **Compliance is automatic** - The system validates components against approved technologies
5. **Violations are actionable** - Teams must either approve the technology or stop using it

## See Also

- [Graph Model Documentation](content/architecture/graph-model.md)
- [TIME Framework](content/features/time-framework.md)
- [Team Approvals](content/features/team-approvals.md)
