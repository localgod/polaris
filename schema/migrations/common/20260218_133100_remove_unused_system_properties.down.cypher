/*
 * Rollback: Recreate indexes for sourceCodeType and hasSourceAccess on System.
 * Property values cannot be restored.
 */

CREATE INDEX system_source_code_type IF NOT EXISTS
FOR (s:System)
ON (s.sourceCodeType);

CREATE INDEX system_has_source_access IF NOT EXISTS
FOR (s:System)
ON (s.hasSourceAccess);
