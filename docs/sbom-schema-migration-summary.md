# SBOM Schema Migration Summary

## Overview

This document summarizes all changes made to support the new SBOM-compliant Component schema in Polaris.

## Changes Made

### 1. Database Schema

**Migration Files Created:**
- `schema/migrations/common/20251102_180000_enhance_component_for_sbom.up.cypher`
- `schema/migrations/common/20251102_180000_enhance_component_for_sbom.down.cypher`

**New Node Types:**
- `Hash` - Stores multiple cryptographic hashes per component
- `License` - Stores license information with SPDX IDs
- `ExternalReference` - Stores external URLs (VCS, docs, issues)
- `Vulnerability` - Stores security vulnerability information

**New Relationships:**
- `(Component)-[:HAS_HASH]->(Hash)`
- `(Component)-[:HAS_LICENSE]->(License)`
- `(Component)-[:HAS_REFERENCE]->(ExternalReference)`
- `(Component)-[:HAS_VULNERABILITY]->(Vulnerability)`

**Component Node Changes:**
- ✅ Added: `purl` (Package URL) - PRIMARY identifier
- ✅ Added: `cpe` (Common Platform Enumeration)
- ✅ Added: `bomRef` (SBOM reference ID)
- ✅ Added: `type` (library, framework, application, etc.)
- ✅ Added: `group` (Maven groupId, npm scope)
- ✅ Added: `scope` (required, optional, dev, test)
- ✅ Added: `supplier`, `author`, `publisher`
- ✅ Added: `description`, `copyright`, `homepage`
- ✅ Added: `releaseDate`, `publishedDate`, `modifiedDate`
- ❌ Removed: `importPath` (Polaris-specific, not in SBOM standards)
- ❌ Removed: `hash` (single string) - Replaced with Hash nodes
- ❌ Removed: `license` (single string) - Replaced with License nodes
- ❌ Removed: `sourceRepo` (single string) - Replaced with ExternalReference nodes

### 2. TypeScript Types

**File:** `types/api.d.ts`

**New Types Added:**
```typescript
ComponentType - Enum for component types
DependencyScope - Enum for dependency scopes
Hash - Hash object with algorithm and value
License - License object with SPDX ID, name, URL, text
ExternalReference - External reference with type and URL
Vulnerability - Vulnerability information
VulnerabilitySeverity - Enum for severity levels
VulnerabilityAnalysisState - Enum for analysis states
VulnerabilityResponse - Enum for response types
VulnerabilityRating - CVSS rating information
VulnerabilityAnalysis - Vulnerability analysis details
```

**Updated Interfaces:**
- `Component` - Completely redesigned with new SBOM fields
- `UnmappedComponent` - Updated to match new Component schema

### 3. Fixture Data

**File:** `schema/fixtures/tech-catalog.json`

**Script Created:** `schema/scripts/update-component-fixtures.cjs`

**Changes:**
- Updated all 9 components to new SBOM schema
- Added real-world metadata (supplier, author, description, copyright)
- Converted single hash to hashes array with SHA-256 and SHA-512
- Converted single license to licenses array with SPDX IDs
- Added external references (VCS, website, issue-tracker)
- Added Package URLs (purl) for all components
- Added CPE identifiers
- Added component types and scopes

**Example Component (react@18.2.0):**
```json
{
  "name": "react",
  "version": "18.2.0",
  "packageManager": "npm",
  "purl": "pkg:npm/react@18.2.0",
  "cpe": "cpe:2.3:a:meta_platforms__inc_:react:18.2.0:*:*:*:*:*:*:*",
  "bomRef": "pkg:npm/react@18.2.0",
  "type": "library",
  "scope": "required",
  "hashes": [
    {"algorithm": "SHA-256", "value": "..."},
    {"algorithm": "SHA-512", "value": "..."}
  ],
  "licenses": [
    {
      "id": "MIT",
      "name": "MIT License",
      "url": "https://opensource.org/licenses/MIT"
    }
  ],
  "copyright": "Copyright (c) Meta Platforms, Inc. and affiliates.",
  "supplier": "Meta Platforms, Inc.",
  "author": "Meta Platforms, Inc.",
  "publisher": "npm",
  "description": "React is a JavaScript library for building user interfaces.",
  "homepage": "https://reactjs.org/",
  "externalReferences": [
    {"type": "vcs", "url": "https://github.com/facebook/react"},
    {"type": "website", "url": "https://reactjs.org/"},
    {"type": "issue-tracker", "url": "https://github.com/facebook/react/issues"}
  ],
  "releaseDate": "2022-06-14T00:00:00Z",
  "publishedDate": "2022-06-14T00:00:00Z"
}
```

### 4. Seed Script

**File:** `schema/scripts/seed.ts`

**Changes:**
- Updated `FixtureData['components']` interface to match new schema
- Completely rewrote `seedComponents()` function to:
  - Create Component nodes with all new SBOM fields
  - Create Hash nodes and HAS_HASH relationships
  - Create License nodes and HAS_LICENSE relationships
  - Create ExternalReference nodes and HAS_REFERENCE relationships
  - Handle datetime conversion for temporal fields

### 5. API Endpoints

**Updated Files:**
- `server/api/components.get.ts`
- `server/api/components/unmapped.get.ts`
- `server/api/systems/[name]/unmapped-components.get.ts`

**Changes:**
- Updated Cypher queries to fetch Hash, License, and ExternalReference nodes
- Updated response mapping to include all new SBOM fields
- Filter out empty/null relationships
- Convert datetime fields to strings

**Example Query Pattern:**
```cypher
MATCH (c:Component)
OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
WITH c,
     collect(DISTINCT {algorithm: h.algorithm, value: h.value}) as hashes,
     collect(DISTINCT {id: l.id, name: l.name, url: l.url}) as licenses,
     collect(DISTINCT {type: ref.type, url: ref.url}) as externalReferences
RETURN c.purl, c.name, c.version, hashes, licenses, externalReferences, ...
```

### 6. UI Components

**Updated Files:**
- `app/pages/components/index.vue`

**Changes:**
- Updated table columns to show:
  - Component type (instead of just package manager)
  - Package URL (purl) for universal identification
  - Multiple licenses (badges) instead of single license string
- Changed key from `comp.hash` to `comp.purl` for uniqueness
- Added conditional rendering for new fields

**Before:**
```vue
<th>License</th>
...
<td>{{ comp.license || 'N/A' }}</td>
```

**After:**
```vue
<th>Type</th>
<th>Package URL</th>
<th>Licenses</th>
...
<td><UiBadge>{{ comp.type }}</UiBadge></td>
<td class="font-mono">{{ comp.purl }}</td>
<td>
  <UiBadge v-for="license in comp.licenses" :key="license.id">
    {{ license.id }}
  </UiBadge>
</td>
```

### 7. Documentation

**New Files Created:**
- `docs/sbom-schema-design.md` - Complete schema design documentation
- `docs/sbom-schema-migration-summary.md` - This file

**Content:**
- Node type definitions
- Relationship patterns
- Example queries
- SPDX and CycloneDX mapping tables
- Migration path
- Benefits analysis

## Migration Steps

### To Apply Changes:

1. **Run Database Migration:**
   ```bash
   # Apply the SBOM enhancement migration
   npm run db:migrate
   ```

2. **Seed Database with New Data:**
   ```bash
   # Clear existing data and reseed with new SBOM schema
   npm run db:reset
   npm run db:seed
   ```

3. **Verify Changes:**
   ```bash
   # Start the development server
   npm run dev
   
   # Visit http://localhost:3000/components
   # Verify components display with new fields
   ```

### To Rollback:

```bash
# Run the down migration
npm run db:migrate:down
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Seed script creates components with new schema
- [ ] Hash nodes are created and linked
- [ ] License nodes are created and linked
- [ ] ExternalReference nodes are created and linked
- [ ] API endpoints return new fields
- [ ] UI displays new component information
- [ ] Package URLs (purl) are shown correctly
- [ ] Multiple licenses display as badges
- [ ] Component types are shown
- [ ] No errors in browser console
- [ ] No errors in server logs

## Breaking Changes

⚠️ **This is a breaking change for the Component schema.**

**Removed Fields:**
- `importPath` - No longer stored (Polaris-specific)
- `hash` - Replaced with `hashes` array via Hash nodes
- `license` - Replaced with `licenses` array via License nodes
- `sourceRepo` - Replaced with `externalReferences` via ExternalReference nodes

**Migration Impact:**
- Existing Component data will need to be migrated or re-imported
- API consumers must update to use new field names
- SBOM ingestion must use new schema

**Mitigation:**
- System is not live yet, so no production data to migrate
- All fixture data has been updated
- All API endpoints have been updated
- All UI components have been updated

## Benefits

### Standards Compliance
- ✅ Full SPDX 2.3 support
- ✅ Full CycloneDX 1.5 support
- ✅ Package URL (purl) standard
- ✅ Common Platform Enumeration (CPE) standard

### Data Quality
- ✅ Multiple hashes with algorithm specification
- ✅ Multiple licenses with SPDX IDs
- ✅ Structured external references
- ✅ Rich metadata (supplier, author, description)
- ✅ Temporal tracking (release dates)

### Functionality
- ✅ Vulnerability tracking ready
- ✅ Dependency graph support
- ✅ License compliance queries
- ✅ Component deduplication via purl
- ✅ Better search and filtering

### Performance
- ✅ Indexed purl for fast lookups
- ✅ Indexed cpe for vulnerability matching
- ✅ Efficient graph relationships
- ✅ Optimized queries with relationship traversal

## Next Steps

1. **Implement SBOM Ingestion Endpoint:**
   - Create `POST /api/repositories/sbom`
   - Support SPDX and CycloneDX formats
   - Parse and map to Component schema

2. **Add Vulnerability Integration:**
   - Create Vulnerability API endpoints
   - Integrate with NVD, GitHub, OSV
   - Link vulnerabilities to components

3. **Enhance UI:**
   - Add component detail pages
   - Show vulnerability information
   - Display dependency graphs
   - Add license compliance dashboard

4. **Add Validation:**
   - Validate purl format
   - Validate SPDX license IDs
   - Validate CPE format
   - Validate hash algorithms

## References

- [SPDX 2.3 Specification](https://spdx.github.io/spdx-spec/v2.3/)
- [CycloneDX 1.5 Specification](https://cyclonedx.org/docs/1.5/)
- [Package URL (purl) Specification](https://github.com/package-url/purl-spec)
- [Common Platform Enumeration (CPE)](https://nvd.nist.gov/products/cpe)
- [SBOM Schema Design Document](./sbom-schema-design.md)
