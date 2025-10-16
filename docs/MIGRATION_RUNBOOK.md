# Migration Runbook

Emergency procedures and operational playbook for database migrations.

## Related Documentation

- [Database Migrations](DATABASE_MIGRATIONS.md) - Complete migration guide
- [Schema Management](SCHEMA.md) - Schema directory overview

## 🚨 Emergency Contacts

- **Database Team**: #database-team
- **On-Call Engineer**: Check PagerDuty
- **DevOps**: #devops

## Pre-Migration Checklist

Before running migrations in production:

- [ ] **Backup Created**: Verify recent backup exists
- [ ] **Staging Tested**: Migrations successful in staging
- [ ] **Dry-Run Complete**: `npm run migrate:up -- --dry-run` passed
- [ ] **Rollback Plan**: Down migrations tested
- [ ] **Monitoring Ready**: Alerts and dashboards configured
- [ ] **Team Notified**: Stakeholders aware of deployment
- [ ] **Maintenance Window**: If required, scheduled and communicated
- [ ] **Rollback Threshold**: Define criteria for rollback decision

## Standard Migration Procedure

### 1. Pre-Deployment

```bash
# Check current status
npm run migrate:status

# Validate pending migrations
npm run migrate:validate

# Dry run
npm run migrate:up -- --dry-run --verbose
```

### 2. Create Backup

```bash
# Neo4j backup (adjust for your setup)
neo4j-admin database dump neo4j --to-path=/backups/pre-migration-$(date +%Y%m%d-%H%M%S)
```

### 3. Apply Migrations

```bash
# Apply with verbose logging
npm run migrate:up -- --verbose

# Monitor logs
tail -f /var/log/neo4j/neo4j.log
```

### 4. Verification

```cypher
// Check migration status
MATCH (m:Migration)
WHERE m.status = 'SUCCESS'
RETURN m.filename, m.appliedAt, m.executionTime
ORDER BY m.appliedAt DESC
LIMIT 5;

// Verify schema changes
CALL db.constraints();
CALL db.indexes();

// Smoke test queries
MATCH (n) RETURN labels(n), count(n) LIMIT 10;
```

### 5. Post-Deployment

- [ ] Verify application health
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Notify team of completion

## Rollback Procedures

### Scenario 1: Migration Failed During Execution

**Symptoms:**
- Migration marked as FAILED in database
- Application errors
- Data inconsistency

**Actions:**

1. **Assess Impact**
   ```cypher
   MATCH (m:Migration {status: 'FAILED'})
   RETURN m.filename, m.description, m.appliedAt
   ```

2. **Check Transaction State**
   ```cypher
   CALL dbms.listTransactions()
   YIELD transactionId, currentQuery, status
   WHERE status <> 'Running'
   RETURN *
   ```

3. **Execute Rollback**
   ```bash
   npm run migrate:down
   ```

4. **Verify Rollback**
   ```cypher
   MATCH (m:Migration)
   WHERE m.filename CONTAINS 'failed_migration_name'
   RETURN m.status
   ```

5. **Restore from Backup** (if rollback fails)
   ```bash
   neo4j-admin database load neo4j --from-path=/backups/pre-migration-YYYYMMDD-HHMMSS
   ```

### Scenario 2: Application Issues After Migration

**Symptoms:**
- Migrations succeeded
- Application throwing errors
- Performance degradation

**Actions:**

1. **Identify Issue**
   - Check application logs
   - Review error rates
   - Check query performance

2. **Quick Fix Attempt**
   - Deploy hotfix if code issue
   - Adjust queries if performance issue

3. **Rollback Decision**
   
   **Rollback if:**
   - Critical functionality broken
   - Data corruption detected
   - Performance unacceptable
   - Cannot fix within 30 minutes

   **Don't rollback if:**
   - Minor non-critical issues
   - Can be fixed with code deploy
   - Affects < 5% of users

4. **Execute Rollback**
   ```bash
   # Rollback migrations
   npm run migrate:down
   
   # Redeploy previous application version
   git checkout <previous-tag>
   npm run deploy
   ```

### Scenario 3: Partial Migration Success

**Symptoms:**
- Some migrations applied
- Others failed
- Inconsistent state

**Actions:**

1. **Assess State**
   ```bash
   npm run migrate:status
   ```

2. **Manual Intervention**
   ```cypher
   // Review what was applied
   MATCH (m:Migration)
   WHERE m.appliedAt > datetime() - duration('PT1H')
   RETURN m.filename, m.status, m.description
   ORDER BY m.appliedAt
   ```

3. **Options:**
   
   **Option A: Complete Migration**
   - Fix failed migration
   - Re-run: `npm run migrate:up`
   
   **Option B: Rollback All**
   - Rollback applied migrations
   - Fix issues
   - Re-apply all together

4. **Document Incident**
   - What failed
   - Why it failed
   - How it was resolved
   - Prevention measures

## Common Issues

### Issue: Constraint Already Exists

**Error:**
```
Neo.ClientError.Schema.ConstraintAlreadyExists
```

**Resolution:**
```cypher
// Check existing constraints
CALL db.constraints() YIELD name, type
WHERE name = 'constraint_name'
RETURN name, type;

// Drop if needed (careful!)
DROP CONSTRAINT constraint_name IF EXISTS;
```

**Prevention:**
Always use `IF NOT EXISTS` in migrations.

### Issue: Lock Timeout

**Error:**
```
Neo.TransientError.Transaction.LockClientStopped
```

**Resolution:**
1. Check for long-running queries:
   ```cypher
   CALL dbms.listQueries()
   YIELD queryId, query, elapsedTimeMillis
   WHERE elapsedTimeMillis > 30000
   RETURN *
   ```

2. Kill blocking queries:
   ```cypher
   CALL dbms.killQuery('query-id')
   ```

3. Retry migration

**Prevention:**
- Schedule migrations during low-traffic periods
- Use batching for large data changes
- Set appropriate timeouts

### Issue: Out of Memory

**Error:**
```
java.lang.OutOfMemoryError: Java heap space
```

**Resolution:**
1. Increase heap size (temporary):
   ```bash
   export NEO4J_dbms_memory_heap_max__size=4G
   ```

2. Use batching:
   ```cypher
   CALL apoc.periodic.iterate(
     "MATCH (n:Node) RETURN n",
     "SET n.property = value",
     {batchSize: 1000}
   )
   ```

**Prevention:**
- Test with production-sized data
- Use batching for large operations
- Monitor memory usage

### Issue: Migration Checksum Mismatch

**Error:**
```
Migration X has been modified after application!
```

**Resolution:**
1. **Never modify applied migrations**
2. Create new corrective migration
3. Document the issue

**If absolutely necessary:**
```cypher
// Update checksum (DANGEROUS - document why!)
MATCH (m:Migration {filename: 'problematic_migration'})
SET m.checksum = 'new_checksum'
```

## Performance Issues

### Slow Migration Execution

**Diagnosis:**
```cypher
MATCH (m:Migration)
WHERE m.executionTime > 10000
RETURN m.filename, m.executionTime, m.appliedAt
ORDER BY m.executionTime DESC
```

**Optimization:**

1. **Use Indexes**
   ```cypher
   // Create index before large data operation
   CREATE INDEX temp_index IF NOT EXISTS
   FOR (n:Node) ON (n.property);
   
   // Run migration
   // ...
   
   // Drop if temporary
   DROP INDEX temp_index IF EXISTS;
   ```

2. **Batch Operations**
   ```cypher
   CALL apoc.periodic.iterate(
     "MATCH (n:OldLabel) RETURN n",
     "SET n:NewLabel REMOVE n:OldLabel",
     {batchSize: 1000, parallel: false}
   )
   ```

3. **Parallel Execution** (use carefully)
   ```cypher
   CALL apoc.periodic.iterate(
     "MATCH (n:Node) RETURN n",
     "SET n.processed = true",
     {batchSize: 1000, parallel: true, concurrency: 4}
   )
   ```

## Monitoring During Migration

### Key Metrics to Watch

1. **Database Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Query execution time

2. **Application Metrics**
   - Error rate
   - Response time
   - Request rate
   - Database connection pool

3. **Migration Metrics**
   - Execution time per migration
   - Success/failure rate
   - Rows affected

### Monitoring Commands

```bash
# Watch migration progress
watch -n 5 'npm run migrate:status'

# Monitor Neo4j metrics
neo4j-admin server memory-recommendation

# Check query performance
cypher-shell "CALL dbms.listQueries() YIELD query, elapsedTimeMillis RETURN *"
```

## Communication Templates

### Pre-Migration Announcement

```
🔧 Database Migration Scheduled

When: [Date/Time]
Duration: ~[X] minutes
Impact: [None/Read-only/Downtime]
Rollback: [Time estimate]

Migrations:
- [Migration 1 description]
- [Migration 2 description]

Contact: [Your name/team]
```

### Migration In Progress

```
🚀 Database migration in progress

Status: [X/Y] migrations applied
ETA: [X] minutes remaining
Current: [Migration name]

No action required.
```

### Migration Complete

```
✅ Database migration complete

Applied: [X] migrations
Duration: [X] minutes
Status: All systems operational

Changes:
- [Change 1]
- [Change 2]
```

### Migration Failed

```
🚨 Database migration failed

Migration: [Name]
Error: [Brief description]
Status: [Rolling back / Investigating]
Impact: [Description]

Actions:
- [Action 1]
- [Action 2]

Updates: [Channel/Thread]
```

## Post-Incident Review

After any migration issue, conduct a review:

1. **Timeline**
   - When did it start?
   - When was it detected?
   - When was it resolved?

2. **Impact**
   - Users affected
   - Duration
   - Data integrity

3. **Root Cause**
   - What went wrong?
   - Why wasn't it caught earlier?

4. **Resolution**
   - What fixed it?
   - How long did it take?

5. **Prevention**
   - What can prevent this?
   - What processes need updating?
   - What monitoring is needed?

6. **Action Items**
   - Assign owners
   - Set deadlines
   - Track completion

## Useful Queries

### Check Database Health

```cypher
// Node counts by label
MATCH (n)
RETURN labels(n) as label, count(n) as count
ORDER BY count DESC;

// Relationship counts by type
MATCH ()-[r]->()
RETURN type(r) as type, count(r) as count
ORDER BY count DESC;

// Check constraints
CALL db.constraints();

// Check indexes
CALL db.indexes();

// Check for orphaned nodes
MATCH (n)
WHERE NOT (n)--()
RETURN labels(n), count(n);
```

### Migration History

```cypher
// Recent migrations
MATCH (m:Migration)
RETURN m.filename, m.status, m.appliedAt, m.executionTime
ORDER BY m.appliedAt DESC
LIMIT 10;

// Failed migrations
MATCH (m:Migration)
WHERE m.status = 'FAILED'
RETURN m.filename, m.description, m.appliedAt
ORDER BY m.appliedAt DESC;

// Slow migrations
MATCH (m:Migration)
WHERE m.executionTime > 5000
RETURN m.filename, m.executionTime, m.appliedAt
ORDER BY m.executionTime DESC;
```

## Escalation Path

1. **Level 1**: Developer on call
   - Attempt standard rollback
   - Check runbook procedures

2. **Level 2**: Database team lead
   - Complex rollback scenarios
   - Performance issues
   - Data integrity concerns

3. **Level 3**: Engineering manager
   - Extended outage
   - Data loss risk
   - Customer impact

4. **Level 4**: CTO/VP Engineering
   - Critical system failure
   - Major data loss
   - Legal/compliance issues

## Training

All engineers should:

- [ ] Read this runbook
- [ ] Practice rollback in staging
- [ ] Understand backup/restore
- [ ] Know escalation path
- [ ] Have access to monitoring

## Document Updates

This runbook should be updated:

- After each incident
- When procedures change
- Quarterly review minimum
- When new team members join

**Last Updated**: 2025-10-15
**Next Review**: 2026-01-15
**Owner**: Database Team
