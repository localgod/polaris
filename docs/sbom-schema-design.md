# SBOM Schema Design - Component Node Enhancement

## Overview

This document describes the enhanced Component node schema designed to fully support SPDX 2.3 and CycloneDX 1.5 SBOM formats without backward compatibility constraints.

## Design Principles

1. **Standards-First**: Align with SPDX and CycloneDX specifications
2. **Universal Identifiers**: Use purl (Package URL) as primary identifier
3. **Structured Data**: Use separate nodes for complex relationships (Hash, License, Vulnerability)
4. **Graph-Native**: Leverage Neo4j relationships for dependencies and references
5. **Queryable**: Optimize for common queries (vulnerabilities, licenses, dependencies)

## Node Types

### Component Node (Enhanced)

Primary node representing a software component from an SBOM.

```cypher
(:Component {
  // === CORE IDENTIFICATION ===
  name: string,                    // Component name (e.g., "react")
  version: string,                 // Version string (e.g., "18.2.0")
  packageManager: string,          // Ecosystem (npm, maven, pypi, cargo, etc.)
  
  // === UNIVERSAL IDENTIFIERS ===
  purl: string,                    // Package URL (PRIMARY KEY)
                                   // e.g., "pkg:npm/react@18.2.0"
  cpe: string?,                    // Common Platform Enumeration
                                   // e.g., "cpe:2.3:a:facebook:react:18.2.0"
  bomRef: string?,                 // Unique identifier within SBOM
  
  // === CLASSIFICATION ===
  type: string?,                   // library, framework, application, container, etc.
  group: string?,                  // Maven groupId, npm scope, Docker owner
                                   // e.g., "org.apache.commons", "@company"
  scope: string?,                  // required, optional, dev, test, runtime, provided
  
  // === SUPPLIER/AUTHOR ===
  supplier: string?,               // Organization/person who supplied
  author: string?,                 // Original author
  publisher: string?,              // Publisher
  
  // === METADATA ===
  description: string?,            // Component description
  copyright: string?,              // Copyright text
  homepage: string?,               // Project homepage URL
  
  // === TEMPORAL ===
  releaseDate: datetime?,          // When component was released
  publishedDate: datetime?,        // When published to registry
  modifiedDate: datetime?          // Last modification
})
```

**Constraints:**
- `UNIQUE (purl)` - Primary identifier
- `UNIQUE (name, version, packageManager)` - Fallback for components without purl

**Indexes:**
- `purl` (unique)
- `cpe`
- `bomRef`
- `type`
- `group`
- `packageManager`
- `scope`
- `supplier`
- `releaseDate`
- `publishedDate`

### Hash Node (New)

Represents cryptographic hashes for component integrity verification.

```cypher
(:Hash {
  componentPurl: string,           // Reference to component
  algorithm: string,               // SHA256, SHA512, BLAKE3, etc.
  value: string                    // Hex-encoded hash value
})
```

**Constraints:**
- `UNIQUE (componentPurl, algorithm)` - One hash per algorithm per component

**Indexes:**
- `algorithm`
- `value`

**Relationships:**
- `(Component)-[:HAS_HASH]->(Hash)`

### License Node (New)

Represents software licenses.

```cypher
(:License {
  id: string,                      // SPDX license ID (e.g., "MIT", "Apache-2.0")
  name: string?,                   // License name
  url: string?,                    // License URL
  text: string?                    // Full license text
})
```

**Constraints:**
- `UNIQUE (id)` - SPDX license IDs are unique

**Indexes:**
- `name`

**Relationships:**
- `(Component)-[:HAS_LICENSE]->(License)`

### ExternalReference Node (New)

Represents external references (VCS, documentation, issue trackers, etc.).

```cypher
(:ExternalReference {
  type: string,                    // vcs, website, documentation, issue-tracker, etc.
  url: string,                     // Reference URL
  comment: string?                 // Optional description
})
```

**Indexes:**
- `type`
- `url`

**Relationships:**
- `(Component)-[:HAS_REFERENCE]->(ExternalReference)`

### Vulnerability Node (New)

Represents known security vulnerabilities.

```cypher
(:Vulnerability {
  id: string,                      // CVE-2024-1234, GHSA-xxxx-xxxx-xxxx
  source: string,                  // NVD, GitHub, OSV, etc.
  description: string?,            // Vulnerability description
  recommendation: string?,         // Remediation recommendation
  
  // Severity (highest rating)
  severity: string,                // critical, high, medium, low, info, none, unknown
  cvssScore: float?,               // CVSS score (0-10)
  cvssVector: string?,             // CVSS vector string
  
  // CWEs
  cwes: string,                    // JSON array of CWE IDs
  
  // Temporal
  createdDate: datetime?,
  publishedDate: datetime?,
  updatedDate: datetime?,
  
  // Analysis
  analysisState: string?,          // exploitable, in_triage, false_positive, not_affected
  analysisJustification: string?,
  analysisResponse: string?,       // can_not_fix, will_not_fix, update, rollback, workaround_available
  
  // References
  advisories: string               // JSON array of advisory URLs
})
```

**Constraints:**
- `UNIQUE (id)` - Vulnerability IDs are unique

**Indexes:**
- `severity`
- `cvssScore`
- `publishedDate`

**Relationships:**
- `(Component)-[:HAS_VULNERABILITY]->(Vulnerability)`
- `(Vulnerability)-[:AFFECTS {versionRange: string}]->(Component)` - For version-specific vulnerabilities

## Relationships

### Existing Relationships (Unchanged)

```cypher
// System uses component
(System)-[:USES {scope: string?}]->(Component)

// Component is version of technology
(Component)-[:IS_VERSION_OF]->(Technology)

// Repository contains components (via system)
(Repository)<-[:HAS_SOURCE_IN]-(System)-[:USES]->(Component)
```

### New Relationships

```cypher
// Component has multiple hashes
(Component)-[:HAS_HASH]->(Hash)

// Component has multiple licenses
(Component)-[:HAS_LICENSE]->(License)

// Component has external references
(Component)-[:HAS_REFERENCE]->(ExternalReference)

// Component has vulnerabilities
(Component)-[:HAS_VULNERABILITY]->(Vulnerability)

// Vulnerability affects components (with version range)
(Vulnerability)-[:AFFECTS {versionRange: string}]->(Component)

// Component depends on other components
(Component)-[:DEPENDS_ON {
  scope: string,                   // required, optional, dev, test, runtime
  isDirect: boolean                // true for direct, false for transitive
}]->(Component)
```

## Dependency Graph

The dependency graph is represented using `DEPENDS_ON` relationships:

```cypher
// Direct dependency
(ComponentA)-[:DEPENDS_ON {scope: 'required', isDirect: true}]->(ComponentB)

// Transitive dependency
(ComponentA)-[:DEPENDS_ON {scope: 'required', isDirect: false}]->(ComponentC)
(ComponentB)-[:DEPENDS_ON {scope: 'required', isDirect: true}]->(ComponentC)
```

## Example Queries

### Find all vulnerabilities for a system

```cypher
MATCH (s:System {name: 'customer-portal'})-[:USES]->(c:Component)
MATCH (c)-[:HAS_VULNERABILITY]->(v:Vulnerability)
WHERE v.severity IN ['critical', 'high']
RETURN c.name, c.version, v.id, v.severity, v.cvssScore
ORDER BY v.cvssScore DESC
```

### Find all components with GPL licenses

```cypher
MATCH (c:Component)-[:HAS_LICENSE]->(l:License)
WHERE l.id STARTS WITH 'GPL'
RETURN c.purl, c.name, c.version, l.id
```

### Find dependency tree for a component

```cypher
MATCH path = (c:Component {purl: 'pkg:npm/react@18.2.0'})-[:DEPENDS_ON*]->(dep:Component)
RETURN path
```

### Find all systems affected by a vulnerability

```cypher
MATCH (v:Vulnerability {id: 'CVE-2024-1234'})-[:AFFECTS]->(c:Component)
MATCH (s:System)-[:USES]->(c)
RETURN DISTINCT s.name, s.businessCriticality, s.environment
ORDER BY s.businessCriticality DESC
```

### Find components without purl (need mapping)

```cypher
MATCH (c:Component)
WHERE c.purl IS NULL
RETURN c.name, c.version, c.packageManager, count{(s:System)-[:USES]->(c)} as systemCount
ORDER BY systemCount DESC
```

## SBOM Ingestion Mapping

### SPDX 2.3 → Component Node

| SPDX Field | Component Property | Notes |
|------------|-------------------|-------|
| PackageName | name | Direct mapping |
| PackageVersion | version | Direct mapping |
| PackageDownloadLocation | purl | Convert to purl format |
| SPDXID | bomRef | Store for cross-referencing |
| PrimaryPackagePurpose | type | Map to ComponentType enum |
| PackageSupplier | supplier | Extract from "Person: Name (email)" format |
| PackageOriginator | author | Extract from format |
| PackageHomePage | homepage | Direct mapping |
| PackageLicenseConcluded | licenses | Create License nodes |
| PackageCopyrightText | copyright | Direct mapping |
| PackageChecksum | hashes | Create Hash nodes |
| ReleaseDate | releaseDate | Convert to datetime |

### CycloneDX 1.5 → Component Node

| CycloneDX Field | Component Property | Notes |
|-----------------|-------------------|-------|
| name | name | Direct mapping |
| version | version | Direct mapping |
| purl | purl | Direct mapping (PRIMARY) |
| cpe | cpe | Direct mapping |
| bom-ref | bomRef | Direct mapping |
| type | type | Direct mapping |
| group | group | Direct mapping |
| scope | scope | Direct mapping |
| supplier | supplier | Extract organization name |
| author | author | Direct mapping |
| publisher | publisher | Direct mapping |
| description | description | Direct mapping |
| copyright | copyright | Direct mapping |
| licenses | licenses | Create License nodes |
| hashes | hashes | Create Hash nodes |
| externalReferences | externalReferences | Create ExternalReference nodes |

## Migration Path

### Phase 1: Schema Migration (Immediate)

1. Run migration: `20251102_180000_enhance_component_for_sbom.up.cypher`
2. Update TypeScript types: `types/api.d.ts`
3. No data migration needed (system not live)

### Phase 2: API Updates (Next)

1. Update Component API endpoints to return new fields
2. Create SBOM ingestion endpoint: `POST /api/repositories/sbom`
3. Update component queries to include Hash, License, ExternalReference nodes

### Phase 3: Vulnerability Integration (Future)

1. Create Vulnerability API endpoints
2. Integrate with vulnerability databases (NVD, GitHub, OSV)
3. Add vulnerability scanning to SBOM ingestion pipeline

## Benefits

### Compared to Old Schema

**Old Schema:**
```typescript
{
  name: string
  version: string
  packageManager: string
  license: string              // ❌ Single license only
  sourceRepo: string           // ❌ Single URL only
  importPath: string           // ❌ Polaris-specific
  hash: string                 // ❌ No algorithm, single hash
}
```

**New Schema:**
- ✅ Universal identifiers (purl, cpe) for deduplication
- ✅ Multiple hashes with algorithms
- ✅ Multiple licenses with metadata
- ✅ Component classification (type, group, scope)
- ✅ Supplier/author tracking
- ✅ External references (VCS, docs, issues)
- ✅ Vulnerability tracking
- ✅ Dependency graph support
- ✅ Temporal metadata
- ✅ Standards-compliant (SPDX, CycloneDX)

### Query Performance

- **purl index**: Fast component lookups by universal identifier
- **cpe index**: Fast vulnerability matching
- **type/scope indexes**: Fast filtering by component classification
- **Hash/License nodes**: Efficient storage of multi-valued properties
- **Dependency relationships**: Native graph traversal for dependency trees

## References

- [SPDX 2.3 Specification](https://spdx.github.io/spdx-spec/v2.3/)
- [CycloneDX 1.5 Specification](https://cyclonedx.org/docs/1.5/)
- [Package URL (purl) Specification](https://github.com/package-url/purl-spec)
- [Common Platform Enumeration (CPE)](https://nvd.nist.gov/products/cpe)
- [CVSS v3.1 Specification](https://www.first.org/cvss/v3.1/specification-document)
