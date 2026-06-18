/*
 * Rollback: Add import job schema
 */

DROP INDEX import_job_item_status IF EXISTS;
DROP INDEX import_job_requested_by IF EXISTS;
DROP INDEX import_job_status IF EXISTS;

DROP CONSTRAINT import_job_item_id_unique IF EXISTS;
DROP CONSTRAINT import_job_id_unique IF EXISTS;
