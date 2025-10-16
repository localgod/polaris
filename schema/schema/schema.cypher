/*
 * Neo4j Database Schema
 * 
 * This file defines the data model for the application.
 * It serves as documentation and source of truth for the graph structure.
 * 
 * Node Labels:
 * - Migration: Tracks applied database migrations
 * 
 * Relationship Types:
 * (None yet)
 * 
 * Last Updated: 2025-10-15
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
