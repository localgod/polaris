# License Compliance Feature

## Overview

The License Compliance feature enables organizations to discover, track, and enforce license policies across all components discovered through SBOM scanning. This comprehensive feature includes database schema, backend services, REST APIs, and user interfaces.

## Architecture

### Database Layer

**License Entity** (`License` node)
- Properties: id, name, spdxId, osiApproved, category, text, url, deprecated
- Relationships:
  - `(Component)-[:HAS_LICENSE]->(License)` - Component uses license
  - `(Policy)-[:ALLOWS_LICENSE]->(License)` - Policy allows license

**Policy Enhancement**
- Added `ruleType` property: `technology-approval` | `license-compliance`
- License compliance policies use `ALLOWS_LICENSE` relationships

### Backend Services

**LicenseRepository** (`server/repositories/license.repository.ts`)
- `findAll(filters)` - List licenses with filtering
- `findById(id)` - Get license details
- `exists(id)` - Check license existence
- `getStatistics()` - License analytics

**PolicyRepository** (`server/repositories/policy.repository.ts`)
- `findLicenseViolations(filters)` - Detect license violations
- Enhanced with license violation detection queries

**PolicyService** (`server/services/policy.service.ts`)
- `getLicenseViolations(filters)` - Business logic for violations
- Includes validation and summary calculation

### REST API Endpoints

**License Discovery**
- `GET /api/licenses` - List all licenses
  - Filters: category, osiApproved, deprecated, search
  - Returns: License details with component usage counts

- `GET /api/licenses/[id]` - Get specific license
  - Returns: Full license details including text

- `GET /api/licenses/statistics` - Organization analytics
  - Returns: Total, by category, OSI approved, deprecated counts

**License Violations**
- `GET /api/policies/license-violations` - List violations
  - Filters: severity, team, system, license
  - Returns: Violations with severity summary

**Policy Management**
- `GET /api/policies?ruleType=license-compliance` - Filter policies
  - Enhanced with ruleType filter

### User Interface

**License Inventory** (`/licenses`)
- License discovery and analytics dashboard
- Statistics cards (total, permissive, copyleft, OSI approved)
- Filterable table with category, OSI approval, component counts
- Search functionality
- Links to license text URLs

**License Violations** (`/violations/licenses`)
- Violation reporting dashboard
- Summary cards (total, critical, error, warning)
- Filterable violation table
- Detailed violation information (team, system, component, license, policy)
- Empty state for compliance

**Navigation**
- Licenses menu item in sidebar
- Link from violations dashboard to license violations

## Features

### License Discovery

- Automatic extraction from SBOM files (CycloneDX, SPDX)
- Deduplication across components
- License categorization (permissive, copyleft, proprietary, public-domain, other)
- OSI approval tracking
- Component usage statistics

### License Policies

- Create allowlist policies for approved licenses
- Support for team-level and organization-level enforcement
- Severity levels (critical, error, warning, info)
- Policy status management (active, inactive, draft)

### Violation Detection

- Automatic detection of non-approved licenses
- Real-time violation reporting
- Filtering by severity, team, system, and license
- Violation summaries by severity level

### Analytics

- License distribution by category
- OSI approval metrics
- Component usage per license
- Violation trends

## Usage Examples

### Create License Compliance Policy

```cypher
// Create policy
CREATE (policy:Policy {
  name: 'Permissive Licenses Only',
  description: 'Only allow permissive open-source licenses',
  ruleType: 'license-compliance',
  severity: 'error',
  status: 'active',
  enforcedBy: 'organization',
  scope: 'all'
})

// Add allowed licenses
MATCH (policy:Policy {name: 'Permissive Licenses Only'})
MATCH (mit:License {id: 'MIT'})
MATCH (apache:License {id: 'Apache-2.0'})
MATCH (bsd:License {id: 'BSD-3-Clause'})
CREATE (policy)-[:ALLOWS_LICENSE]->(mit)
CREATE (policy)-[:ALLOWS_LICENSE]->(apache)
CREATE (policy)-[:ALLOWS_LICENSE]->(bsd)

// Apply to team
MATCH (policy:Policy {name: 'Permissive Licenses Only'})
MATCH (team:Team {name: 'Platform Team'})
CREATE (team)-[:SUBJECT_TO]->(policy)
```

### Query License Violations

```bash
# All violations
curl http://localhost:3000/api/policies/license-violations

# Critical violations only
curl http://localhost:3000/api/policies/license-violations?severity=critical

# Violations for specific team
curl http://localhost:3000/api/policies/license-violations?team=platform-team

# Violations for specific license
curl http://localhost:3000/api/policies/license-violations?license=GPL-3.0
```

### Query License Inventory

```bash
# All licenses
curl http://localhost:3000/api/licenses

# Permissive licenses only
curl http://localhost:3000/api/licenses?category=permissive

# OSI-approved licenses
curl http://localhost:3000/api/licenses?osiApproved=true

# Search for Apache licenses
curl http://localhost:3000/api/licenses?search=apache

# Get statistics
curl http://localhost:3000/api/licenses/statistics
```

## Database Schema

### License Node

```cypher
(:License {
  id: String,              // SPDX identifier (unique)
  name: String,            // Human-readable name
  spdxId: String,          // Canonical SPDX identifier
  osiApproved: Boolean,    // OSI approval status
  url: String,             // License text URL
  category: String,        // permissive, copyleft, proprietary, public-domain, other
  text: String,            // Full license text
  deprecated: Boolean,     // Whether license is deprecated
  createdAt: DateTime,     // When license was first seen
  updatedAt: DateTime      // Last update timestamp
})
```

### Relationships

```cypher
// Component uses license
(Component)-[:HAS_LICENSE]->(License)

// Policy allows license
(Policy)-[:ALLOWS_LICENSE]->(License)
```

### Indexes

```cypher
// Constraint
CREATE CONSTRAINT license_id_unique IF NOT EXISTS
FOR (l:License)
REQUIRE l.id IS UNIQUE;

// Indexes
CREATE INDEX license_spdx_id IF NOT EXISTS
FOR (l:License)
ON (l.spdxId);

CREATE INDEX license_category IF NOT EXISTS
FOR (l:License)
ON (l.category);

CREATE INDEX license_osi_approved IF NOT EXISTS
FOR (l:License)
ON (l.osiApproved);
```

## Migration

The license compliance feature was implemented through the following migrations:

1. **20251205_080214_create_license_entity_and_relationships**
   - Creates License nodes from Component.licenses arrays
   - Creates HAS_LICENSE relationships
   - Adds constraints and indexes
   - Preserves original data for rollback safety

## Testing

### Repository Tests

- `test/server/repositories/license.repository.spec.ts` - 13 tests
- `test/server/repositories/policy.repository.license.spec.ts` - 5 tests

### API Tests

- `test/server/api/licenses.spec.ts` - 7 tests
- `test/server/api/license-violations.spec.ts` - 7 tests

**Total: 32 tests, all passing**

## Performance Considerations

- License queries use indexes on id, spdxId, category, osiApproved
- Violation detection leverages policy and license indexes
- Statistics aggregated at database level
- Suitable for large component datasets (10,000+ components)

## Future Enhancements

- License detail page with full text and usage breakdown
- License violation trends over time
- Export functionality for compliance reports
- License policy management UI
- Bulk license approval workflows
- Automated policy suggestions based on component usage
- License compatibility checking
- SBOM export with license information
- Integration with external license databases (SPDX, OSI)

## Related Issues

- #103 - License entity and relationships
- #104 - License compliance policy engine
- #105 - License compliance API endpoints
- #106 - License compliance UI

## Pull Requests

- #107 - License entity nodes and component filtering
- #108 - License compliance support for policy engine
- #109 - License compliance API endpoints
- #110 - License compliance UI pages
- #111 - Add Licenses to navigation menu
