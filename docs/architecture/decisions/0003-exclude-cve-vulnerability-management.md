# ADR-0003 Exclude CVE and Vulnerability Management

## Status

**Accepted**

Date: 2025-11-25

## Context

When designing the SBOM and component tracking features for Polaris, we needed to decide whether to include vulnerability management capabilities such as:
- Storing CVE (Common Vulnerabilities and Exposures) data
- Tracking vulnerability severity and CVSS scores
- Managing vulnerability analysis states (exploitable, false positive, etc.)
- Linking vulnerabilities to components
- Providing vulnerability remediation workflows

### Initial Design

The initial schema included a `Vulnerability` node type with:
- CVE/GHSA/OSV identifiers
- Severity levels and CVSS scores
- Published and modified dates
- Analysis states
- Relationships to components via `HAS_VULNERABILITY`

### Problems Identified

1. **Scope Creep**: Vulnerability management is a complex domain requiring:
   - Real-time vulnerability feeds (NVD, GitHub Security Advisories, OSV)
   - Continuous scanning and updates
   - False positive management
   - Remediation tracking
   - Integration with security tools

2. **Specialized Tools Exist**: Organizations already use mature security tools:
   - **GitHub Dependabot**: Automated dependency updates and vulnerability alerts
   - **Trivy**: Comprehensive security scanner for containers and code
   - **Grype**: Vulnerability scanner for container images and filesystems
   - **Dependency-Track**: Open-source SBOM and vulnerability management
   - **Snyk**: Commercial vulnerability management platform
   
   These tools are purpose-built for security and maintained by dedicated teams.

3. **Maintenance Burden**: Keeping vulnerability data current requires:
   - Daily updates from multiple vulnerability databases
   - Matching algorithms (CPE, PURL to CVE)
   - Version range parsing and comparison
   - Handling of vulnerability aliases and duplicates

4. **Data Freshness**: Vulnerability data becomes stale quickly:
   - New CVEs published daily
   - Severity scores updated as exploits emerge
   - Analysis states change as patches are released

5. **Expertise Required**: Proper vulnerability management requires:
   - Security expertise for triage
   - Understanding of CVSS scoring
   - Knowledge of exploit availability
   - Patch management processes

### Constraints

- Polaris focuses on technology governance and SBOM tracking
- Organizations already have security tools in place (Dependabot, Trivy, etc.)
- Limited resources for maintaining vulnerability feeds
- Complementary services provide better separation of concerns

### Alternatives Considered

1. **Full Vulnerability Management**
   - Store and manage all CVE data
   - Provide scanning and remediation workflows
   - **Rejected**: Too complex, duplicates existing tools

2. **Basic Vulnerability Storage**
   - Store CVE IDs and severity only
   - No scanning or updates
   - **Rejected**: Provides little value without freshness

3. **Vulnerability Count Only**
   - Display count from external tools
   - No storage of vulnerability data
   - **Rejected**: Still requires integration complexity

4. **Complementary Service Model** (Chosen)
   - Focus on SBOM and component tracking
   - Operate alongside security scanning tools
   - Each tool focuses on its core competency

## Decision

Polaris will **not** manage CVE or vulnerability information. Instead, Polaris will operate as a **complementary service** alongside security scanning tools, with each service focusing on its core competency.

### Architecture: Complementary Services

Polaris is designed to work **alongside** security tools, not replace them:

```
                    ┌──────────────────┐
                    │   CI/CD Pipeline │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │  Generate SBOM   │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ↓                             ↓
    ┌─────────────────┐         ┌─────────────────┐
    │    Polaris      │         │  Dependabot /   │
    │                 │         │  Trivy / Grype  │
    │ • SBOM Storage  │         │                 │
    │ • Component     │         │ • CVE Scanning  │
    │   Tracking      │         │ • Vulnerability │
    │ • Technology    │         │   Management    │
    │   Governance    │         │ • Remediation   │
    └─────────────────┘         └─────────────────┘
```

### Service Boundaries

**Polaris (Technology Governance):**
- ✅ Collect and store SBOMs (CycloneDX, SPDX)
- ✅ Track components and their versions
- ✅ Link components to systems
- ✅ Provide component inventory via API
- ✅ Track technology governance and approvals
- ✅ Monitor technology usage across systems

**Security Tools (Vulnerability Management):**
- ✅ Scan for vulnerabilities (CVE, GHSA, OSV)
- ✅ Store and update CVE data
- ✅ Calculate risk scores (CVSS)
- ✅ Provide remediation workflows
- ✅ Track vulnerability states
- ✅ Generate security alerts

### Why This Separation Works

1. **Specialized Focus**: Each tool does what it does best
2. **Parallel Operation**: Both services consume the same SBOM from CI/CD
3. **No Duplication**: Polaris doesn't duplicate security tool functionality
4. **Tool Choice**: Organizations can choose their preferred security scanner
5. **Clear Ownership**: Governance team uses Polaris, security team uses scanning tools

### Implementation

1. **Remove Vulnerability Node**: Delete the `Vulnerability` node type and all related schema
2. **Remove Vulnerability Properties**: Remove `vulnerabilityCount` from Component interface
3. **Focus on Governance**: Concentrate on technology approval and usage tracking
4. **Parallel Submission**: CI/CD submits SBOM to both Polaris and security tools

## Consequences

### Positive

1. **Focused Scope**: Polaris remains focused on technology governance, not security scanning
2. **Reduced Complexity**: No need to maintain vulnerability feeds or scanning logic
3. **Best-in-Class Tools**: Organizations use specialized tools for each concern
4. **Lower Maintenance**: No burden of keeping vulnerability data current
5. **Clear Boundaries**: Governance team and security team use appropriate tools
6. **Parallel Operation**: Both services can consume SBOM from CI/CD independently
7. **Tool Flexibility**: Organizations choose their preferred security scanner
8. **Resource Efficiency**: Development resources focused on governance features

### Negative

1. **Multiple Tools**: Organizations run both Polaris and security scanning tools
2. **Separate Interfaces**: Users switch between tools for governance and security views
3. **Coordination Required**: Teams must coordinate on SBOM format and submission
4. **No Unified View**: Cannot see governance and security data in one place

### Neutral

1. **Complementary Services**: Polaris and security tools serve different purposes
2. **Parallel Workflows**: CI/CD submits SBOM to both services
3. **Documentation**: Must document how Polaris fits with security tools
4. **Future Integration**: Could add read-only vulnerability display via API integration (optional)

## References

- Migration: `20251125_074808_remove_vulnerability_node.up.cypher`
- Issue: Vulnerability node was removed on 2025-11-25
- Related Tools:
  - [Dependency-Track](https://dependencytrack.org/) - Open-source SBOM and vulnerability management
  - [Grype](https://github.com/anchore/grype) - Vulnerability scanner
  - [Trivy](https://github.com/aquasecurity/trivy) - Security scanner
  - [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Dependency vulnerability scanner
- Standards:
  - [CVE](https://cve.mitre.org/) - Common Vulnerabilities and Exposures
  - [NVD](https://nvd.nist.gov/) - National Vulnerability Database
  - [OSV](https://osv.dev/) - Open Source Vulnerabilities
