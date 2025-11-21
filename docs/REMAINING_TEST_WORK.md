# Remaining Work for Skipped Model Tests

This document outlines the remaining work needed to complete the implementation of all skipped model tests from issue #59.

## Status Summary

### ✅ Completed (3 of 7 test files - 18 scenarios)

1. **test/examples/proper-cleanup.spec.ts** (2 scenarios) - ✅ COMPLETE
2. **test/model/migration-runner.spec.ts** (10 scenarios) - ✅ COMPLETE
3. **test/model/usage-tracking.spec.ts** (6 scenarios) - ✅ COMPLETE

### 🚧 In Progress (1 of 7 test files - 15 scenarios)

1. **test/model/audit-trail.spec.ts** (15 scenarios) - 🚧 PARTIAL
   - ✅ Background section implemented
   - ✅ First scenario using data tables
   - ❌ 14 scenarios remaining

### ⏸️ Not Started (3 of 7 test files - 21 scenarios)

1. **test/model/team-technology-approvals.spec.ts** (3 scenarios) - ⏸️ TODO
2. **test/model/version-specific-approvals.spec.ts** (4 scenarios) - ⏸️ TODO
3. **test/model/approval-resolution.spec.ts** (15 scenarios) - ⏸️ TODO

---

## Detailed Remaining Work

### 4. audit-trail.spec.ts (14 remaining scenarios)

**File:** `test/model/audit-trail.spec.ts.skip`

**Status:** Background and first scenario completed, needs 14 more scenarios

**Required Changes:**

1. **Scenario: Tracking field changes** (lines ~22-28 in feature file)
   - Parse data table with before/after columns
   - Create audit log with field change tracking
   - Verify changedFields list

2. **Scenario: Linking audit log to user** (lines ~30-34)
   - Create user node
   - Create audit log with PERFORMED_BY relationship
   - Query all audit logs by user

3. **Scenario: Querying audit logs by entity** (lines ~36-40)
   - Create multiple audit logs for same entity
   - Query by entityType and entityId
   - Verify ordering by timestamp descending

4. **Scenario: Querying audit logs by operation type** (lines ~42-45)
   - Create audit logs with various operations
   - Query filtered by operation
   - Verify only specified operation returned

5. **Scenario: Querying audit logs by time range** (lines ~47-50)
   - Create audit logs from past 30 days
   - Query last 7 days
   - Verify date filtering

6. **Scenario: Recording approval operations** (lines ~52-61)
   - Parse data table with approval details
   - Create audit log with TIME category metadata
   - Verify metadata captured

7. **Scenario: Recording SBOM operations** (lines ~63-73)
   - Parse data table with SBOM details
   - Create audit log with component count
   - Verify SBOM-specific metadata

8. **Scenario: Tracking vulnerability detection** (lines ~75-83)
   - Parse data table with vulnerability details
   - Create audit log for CVE detection
   - Verify severity and vulnerability ID

9. **Scenario: Using session and correlation IDs** (lines ~85-88)
   - Create multiple logs with same sessionId
   - Query by sessionId
   - Verify grouping

10. **Scenario: Filtering by source** (lines ~90-93)
    - Create logs from different sources
    - Query by source
    - Verify filtering

11. **Scenario: Tagging audit logs** (lines ~95-102)
    - Parse data table with tags
    - Create audit log with tags array
    - Query by tag

12. **Scenario: Composite index performance** (lines ~104-108)
    - Create 1000 audit logs
    - Query with entity and time range
    - Verify query performance

13. **Scenario: Audit log uniqueness** (lines ~110-113)
    - Create audit log with specific ID
    - Attempt to create duplicate ID
    - Verify unique constraint failure

14. **Scenario: Recording complete state changes** (lines ~115-118)
    - Create audit log with previousState and currentState
    - Compare states
    - Identify differences

15. **Scenario: Capturing user context** (lines ~120-127)
    - Parse data table with user context (IP, userAgent, sessionId)
    - Create audit log with context
    - Analyze access patterns

**Estimated Time:** 4-5 hours

---

### 5. team-technology-approvals.spec.ts (3 scenarios)

**File:** `test/model/team-technology-approvals.spec.ts.skip`

**Status:** Only placeholder TODOs exist

**Required Changes:**

1. **Add imports:**
   ```typescript
   import { parseDataTable } from '../helpers/data-table-parser'
   ```

2. **Add Background section:**
   ```typescript
   Background(({ Given, And }) => {
     Given('a Neo4j database is available', () => {
       expect(driver).toBeDefined()
     })

     And('the following teams exist:', async (dataTable: string) => {
       const teams = parseDataTable(dataTable)
       const session = driver.session()
       try {
         for (const team of teams) {
           await session.run(`
             CREATE (t:Team {
               name: $name,
               email: $email,
               responsibilityArea: $responsibilityArea
             })
           `, team)
         }
       } finally {
         await session.close()
       }
     })

     And('the following technologies exist:', async (dataTable: string) => {
       const technologies = parseDataTable(dataTable)
       const session = driver.session()
       try {
         for (const tech of technologies) {
           await session.run(`
             CREATE (t:Technology {
               name: $name,
               category: $category,
               description: $description
             })
           `, tech)
         }
       } finally {
         await session.close()
       }
     })
   })
   ```

3. **Scenario 1: Different teams approve the same technology**
   - Implement step for creating APPROVES relationships
   - Query approvals for specific technology
   - Verify each team has correct approval status

4. **Scenario 2: Team deprecates while another keeps approved**
   - Create initial approvals
   - Update one team's approval to deprecated with EOL date
   - Verify both teams have independent statuses
   - Verify EOL date is set

5. **Scenario 3: Team with no approval defaults to restricted**
   - Create approval for one team only
   - Query approval for team without approval
   - Verify default "restricted" status

**Estimated Time:** 2-3 hours

---

### 6. version-specific-approvals.spec.ts (4 scenarios)

**File:** `test/model/version-specific-approvals.spec.ts.skip`

**Status:** Only placeholder TODOs exist

**Required Changes:**

1. **Add imports and Background section** (similar to team-technology-approvals)

2. **Scenario 1:** (Check feature file for exact scenario names)
   - Implement version-specific approval creation
   - Parse data tables for version information
   - Verify version-specific relationships

3. **Scenario 2:**
   - Test version constraint logic
   - Implement constraint evaluation (>=, <, etc.)
   - Verify constraint satisfaction

4. **Scenario 3:**
   - Test version-specific override of general approval
   - Verify priority hierarchy

5. **Scenario 4:**
   - Test multiple version-specific approvals
   - Verify independent version statuses

**Note:** Need to review feature file for exact scenario requirements

**Estimated Time:** 2-3 hours

---

### 7. approval-resolution.spec.ts (15 scenarios)

**File:** `test/model/approval-resolution.spec.ts.skip`

**Status:** Some placeholder implementations exist

**Required Changes:**

This is the most complex file with approval resolution logic.

1. **Add Background section with data tables:**
   - Parse teams table
   - Parse technologies table
   - Parse versions table
   - Create all necessary nodes

2. **Implement 15 scenarios from feature file:**
   - Version-specific approval precedence
   - Technology-level fallback
   - Default to restricted
   - Version constraint evaluation (approved range)
   - Version constraint evaluation (restricted range)
   - Version-specific override of constraint
   - Multiple resolution paths with priority
   - Resolution includes metadata
   - Technology-level restricted overrides constraint
   - Experimental status handling
   - Resolution for multiple teams
   - Complex version constraints (>=11 <21)
   - Resolution caching and performance
   - Audit trail for resolution decisions
   - Resolution with missing version node

3. **Complex Logic Required:**
   - Approval resolution algorithm
   - Version constraint parsing and evaluation
   - Priority hierarchy implementation
   - Metadata propagation
   - Performance optimization

**Note:** This file has the most complex business logic and will require careful implementation

**Estimated Time:** 5-6 hours

---

## Implementation Strategy

### Recommended Order

1. **team-technology-approvals.spec.ts** (2-3 hours)
   - Simpler structure
   - Good practice for data table patterns
   - Establishes approval relationship patterns

2. **version-specific-approvals.spec.ts** (2-3 hours)
   - Builds on team-technology-approvals
   - Adds version constraint logic
   - Prepares for approval-resolution

3. **audit-trail.spec.ts** (4-5 hours)
   - Many scenarios but mostly similar patterns
   - Good for establishing audit log patterns
   - Can be done in parallel with others

4. **approval-resolution.spec.ts** (5-6 hours)
   - Most complex logic
   - Do last after patterns are established
   - May require algorithm implementation

**Total Estimated Time:** 15-20 hours

---

## Common Patterns Needed

### Data Table Parsing in Background

```typescript
Background(({ Given, And }) => {
  And('the following X exist:', async (dataTable: string) => {
    const items = parseDataTable(dataTable)
    const session = driver.session()
    try {
      for (const item of items) {
        await session.run(`CREATE (n:X $props)`, { props: item })
      }
    } finally {
      await session.close()
    }
  })
})
```

### Key-Value Data Table Steps

```typescript
When('I create X with:', async (dataTable: string) => {
  const data = parseDataTableAsObject(dataTable)
  await session.run(`CREATE (n:X $props)`, { props: data })
})
```

### Relationship Creation with Properties

```typescript
And('the "X" approves "Y" with status "Z"', async () => {
  await session.run(`
    MATCH (x:X {name: $xName})
    MATCH (y:Y {name: $yName})
    CREATE (x)-[r:APPROVES {status: $status}]->(y)
  `, { xName: 'X', yName: 'Y', status: 'Z' })
})
```

---

## Testing Checklist

For each implemented scenario:

- [ ] Import data table parser if needed
- [ ] Add Background section if not present
- [ ] Implement all steps with data table parsing
- [ ] Use proper step types (Given/When/Then/And/But)
- [ ] Add proper cleanup in afterEach/afterAll
- [ ] Test with Neo4j available
- [ ] Verify tests skip gracefully without Neo4j
- [ ] Check for duplicate step definitions
- [ ] Ensure feature file and spec file match

---

## Resources

- **Data Table Parser:** `test/helpers/data-table-parser.ts`
- **Parser Tests:** `test/helpers/data-table-parser.spec.ts`
- **Working Examples:** `test/model/usage-tracking.spec.ts`
- **Test README:** `test/README.md` (updated with data table examples)

---

## Notes

1. All placeholder tests currently skip when Neo4j is not available
2. Tests use conditional execution to avoid failures in CI
3. Data table parser is fully tested and ready to use
4. Background sections run before each scenario
5. Clean up test data properly to avoid test interference

---

## Future Enhancements

After completing the basic implementations:

1. **Add more comprehensive test data**
2. **Test edge cases** (null values, empty strings, etc.)
3. **Performance testing** for large data sets
4. **Error handling** for invalid data
5. **Integration tests** with actual schema migrations
