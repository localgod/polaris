/*
 * Migration: Add health snapshot schema
 * Version: 20260619.130000
 *
 * Adds mutable component health snapshots, read-only advisory observations,
 * and durable health refresh job tracking.
 */

CREATE CONSTRAINT health_snapshot_component_purl_unique IF NOT EXISTS
FOR (h:HealthSnapshot)
REQUIRE h.componentPurl IS UNIQUE;

CREATE CONSTRAINT advisory_id_unique IF NOT EXISTS
FOR (a:Advisory)
REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT health_refresh_job_id_unique IF NOT EXISTS
FOR (j:HealthRefreshJob)
REQUIRE j.id IS UNIQUE;

CREATE CONSTRAINT health_refresh_job_item_id_unique IF NOT EXISTS
FOR (i:HealthRefreshJobItem)
REQUIRE i.id IS UNIQUE;

CREATE INDEX health_snapshot_eol_status IF NOT EXISTS
FOR (h:HealthSnapshot)
ON (h.eolStatus);

CREATE INDEX health_snapshot_maintenance_status IF NOT EXISTS
FOR (h:HealthSnapshot)
ON (h.maintenanceStatus);

CREATE INDEX health_snapshot_vulnerability_total IF NOT EXISTS
FOR (h:HealthSnapshot)
ON (h.vulnerabilityTotal);

CREATE INDEX health_snapshot_security_score IF NOT EXISTS
FOR (h:HealthSnapshot)
ON (h.securityScore);

CREATE INDEX advisory_aliases IF NOT EXISTS
FOR (a:Advisory)
ON (a.aliases);

CREATE INDEX advisory_cvss_score IF NOT EXISTS
FOR (a:Advisory)
ON (a.cvssScore);

CREATE INDEX health_refresh_job_status IF NOT EXISTS
FOR (j:HealthRefreshJob)
ON (j.status);

CREATE INDEX health_refresh_job_trigger IF NOT EXISTS
FOR (j:HealthRefreshJob)
ON (j.trigger);

CREATE INDEX health_refresh_job_item_status IF NOT EXISTS
FOR (i:HealthRefreshJobItem)
ON (i.status);

CREATE INDEX health_refresh_job_item_component_purl IF NOT EXISTS
FOR (i:HealthRefreshJobItem)
ON (i.componentPurl);
