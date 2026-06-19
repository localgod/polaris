/*
 * Rollback: Add health snapshot schema
 */

DROP INDEX health_refresh_job_item_component_purl IF EXISTS;
DROP INDEX health_refresh_job_item_status IF EXISTS;
DROP INDEX health_refresh_job_trigger IF EXISTS;
DROP INDEX health_refresh_job_status IF EXISTS;
DROP INDEX advisory_cvss_score IF EXISTS;
DROP INDEX advisory_aliases IF EXISTS;
DROP INDEX health_snapshot_security_score IF EXISTS;
DROP INDEX health_snapshot_vulnerability_total IF EXISTS;
DROP INDEX health_snapshot_maintenance_status IF EXISTS;
DROP INDEX health_snapshot_eol_status IF EXISTS;

DROP CONSTRAINT health_refresh_job_item_id_unique IF EXISTS;
DROP CONSTRAINT health_refresh_job_id_unique IF EXISTS;
DROP CONSTRAINT advisory_id_unique IF EXISTS;
DROP CONSTRAINT health_snapshot_component_purl_unique IF EXISTS;

MATCH (j:HealthRefreshJob)
DETACH DELETE j;

MATCH (i:HealthRefreshJobItem)
DETACH DELETE i;

MATCH (h:HealthSnapshot)
DETACH DELETE h;

MATCH (a:Advisory)
WHERE NOT ()-[:HAS_ADVISORY]->(a)
DETACH DELETE a;
