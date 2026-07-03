// Rollback: intentionally a no-op.
//
// This migration deleted or converted componentless Technology nodes.
// Deleted nodes cannot be resurrected -- Cypher migrations are not a backup
// mechanism. Converted-to-Platform nodes could theoretically be converted
// back, but doing so automatically risks clobbering Platform data entered
// or changed since the migration ran, so it is deliberately not attempted
// here.
//
// To recover: query AuditLog entries with source = 'MIGRATION' and
// entityType = 'Technology' created around this migration's run time --
// each one's `changes` property holds the full pre-migration node data as
// JSON (operation = 'CONVERT' for Platform conversions, 'DELETE' otherwise).
