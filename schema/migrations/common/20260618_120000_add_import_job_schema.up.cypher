/*
 * Migration: Add import job schema
 * Version: 20260618.120000
 *
 * Description:
 * Adds persisted job state for background import workflows.
 *
 * Rollback: See 20260618_120000_add_import_job_schema.down.cypher
 */

CREATE CONSTRAINT import_job_id_unique IF NOT EXISTS
FOR (j:ImportJob)
REQUIRE j.id IS UNIQUE;

CREATE CONSTRAINT import_job_item_id_unique IF NOT EXISTS
FOR (i:ImportJobItem)
REQUIRE i.id IS UNIQUE;

CREATE INDEX import_job_status IF NOT EXISTS
FOR (j:ImportJob)
ON (j.status);

CREATE INDEX import_job_requested_by IF NOT EXISTS
FOR (j:ImportJob)
ON (j.requestedBy);

CREATE INDEX import_job_item_status IF NOT EXISTS
FOR (i:ImportJobItem)
ON (i.status);
