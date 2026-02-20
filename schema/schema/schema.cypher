/*
 * Neo4j Database Schema
 * 
 * This file defines the data model for the application.
 * It serves as documentation and source of truth for the graph structure.
 * 
 * Node Labels:
 * - Migration: Tracks applied database migrations
 * - AuditLog: Tracks all data changes for compliance and debugging
 * 
 * Relationship Types:
 * - PERFORMED_BY: Links audit log entries to users who performed the action
 * - AUDITS: Links audit log entries to the entities they track
 * 
 * Last Updated: 2025-11-05
 */

// Migration tracking node
// Properties:
//   - filename: String (required) - Migration file name
//   - version: String (required) - Semantic version
//   - checksum: String (required) - SHA256 hash of migration content
//   - appliedAt: DateTime (required) - When migration was applied
//   - appliedBy: String (optional) - User/system that applied it
//   - executionTime: Integer (optional) - Execution time in milliseconds
//   - status: String (required) - SUCCESS, FAILED, ROLLED_BACK
//   - description: String (optional) - Human-readable description
(:Migration)

// AuditLog node
// Properties:
//   Core Identity:
//   - id: String (UUID, required) - Unique identifier for the audit entry
//   - timestamp: DateTime (required) - When the change occurred
//   - operation: String (required) - Type of operation (CREATE, UPDATE, DELETE, APPROVE, etc.)
//
//   Entity Information:
//   - entityType: String (required) - Type of entity that changed (Technology, System, Team, etc.)
//   - entityId: String (required) - Unique identifier of the entity
//   - entityLabel: String (optional) - Human-readable label for the entity
//
//   Change Details:
//   - changes: Map (optional) - Field-level changes as key-value pairs
//   - changedFields: List<String> (optional) - List of field names that changed
//   - previousState: Map (optional) - Complete state before the change
//   - currentState: Map (optional) - Complete state after the change
//
//   Actor Information:
//   - userId: String (required) - ID of the user who performed the action
//   - userName: String (optional) - Name of the user at time of action
//   - userEmail: String (optional) - Email of the user at time of action
//
//   Context & Metadata:
//   - reason: String (optional) - User-provided reason for the change
//   - source: String (required) - Source of the change (UI, API, SBOM, MIGRATION, SYSTEM)
//   - ipAddress: String (optional) - IP address of the client
//   - userAgent: String (optional) - User agent string of the client
//   - sessionId: String (optional) - Session identifier for grouping related changes
//   - correlationId: String (optional) - For tracking changes across multiple entities
//   - requestId: String (optional) - API request identifier
//   - metadata: Map (optional) - Additional context-specific information
//   - tags: List<String> (optional) - Tags for categorization and filtering
//
// Relationships:
//   - (AuditLog)-[:PERFORMED_BY]->(User) - Links to user who performed the action
//   - (AuditLog)-[:AUDITS]->(Entity) - Links to the entity that was changed (optional)
(:AuditLog)

// License node
// Properties:
//   - id: String (required) - SPDX identifier (e.g., "MIT", "Apache-2.0")
//   - name: String (required) - Human-readable name (e.g., "MIT License")
//   - spdxId: String (required) - Canonical SPDX identifier
//   - osiApproved: Boolean (optional) - OSI approval status
//   - url: String (optional) - License text URL
//   - category: String (optional) - License category (permissive, copyleft, proprietary, public-domain, other)
//   - text: String (optional) - Full license text
//   - deprecated: Boolean (optional) - Whether license is deprecated
//   - allowed: Boolean (required) - Whether license is allowed org-wide (default: true)
//   - createdAt: DateTime (required) - When license was first seen
//   - updatedAt: DateTime (required) - Last update timestamp
//
// Relationships:
//   - (Component)-[:HAS_LICENSE]->(License) - Component uses this license
(:License)

// VersionConstraint node
// Properties:
//   - name: String (required) - Unique constraint name
//   - description: String (optional) - Constraint description
//   - severity: String (required) - Severity level (critical, error, warning, info)
//   - versionRange: String (required) - Semver range (e.g., ">=18.0.0 <20.0.0")
//   - scope: String (required) - Constraint scope (organization, team)
//   - subjectTeam: String (optional) - Team name when scope=team
//   - status: String (required) - Constraint status (active, draft, archived)
//   - createdAt: DateTime (required) - When constraint was created
//   - updatedAt: DateTime (required) - Last update timestamp
//
// Relationships:
//   - (Team)-[:SUBJECT_TO]->(VersionConstraint) - Team is subject to this constraint
//   - (VersionConstraint)-[:GOVERNS]->(Technology) - Constraint governs technology versions
(:VersionConstraint)
