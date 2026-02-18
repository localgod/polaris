/*
 * Migration: Remove unused System properties
 * Version: 20260218.133100
 *
 * Removes sourceCodeType and hasSourceAccess properties and their indexes
 * from System nodes. These were added in 20251029_080900 but never written
 * by any Cypher query or displayed in the UI.
 */

// Drop indexes
DROP INDEX system_source_code_type IF EXISTS;
DROP INDEX system_has_source_access IF EXISTS;

// Remove properties from any System nodes that have them
MATCH (s:System)
WHERE s.sourceCodeType IS NOT NULL OR s.hasSourceAccess IS NOT NULL
SET s.sourceCodeType = null, s.hasSourceAccess = null;
