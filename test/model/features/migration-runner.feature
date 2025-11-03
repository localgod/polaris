Feature: Database Migration Runner
  As a developer
  I want to manage database schema migrations
  So that I can evolve the database schema safely and consistently

  Background:
    Given a Neo4j database is available
    And a test migrations directory exists

  Scenario: Calculate consistent checksums
    Given a migration file with content "CREATE (n:Test)"
    When I calculate the checksum twice
    Then both checksums should be identical
    And the checksum should be 64 characters long

  Scenario: Generate different checksums for different content
    Given a migration file with content "CREATE (n:Test1)"
    And another migration file with content "CREATE (n:Test2)"
    When I calculate checksums for both files
    Then the checksums should be different

  Scenario: Parse migration metadata from header
    Given a migration file with metadata header
    When I parse the migration metadata
    Then the version should be extracted correctly
    And the author should be extracted correctly
    And the description should be extracted correctly

  Scenario: Extract version from filename
    Given a migration file named "2025-10-15_120000_test.up.cypher"
    And the file has no metadata header
    When I parse the migration metadata
    Then the version should be "2025.10.15.120000"

  Scenario: Apply a valid migration
    Given a valid migration file exists
    When I apply the migration
    Then the migration should succeed
    And the execution time should be recorded
    And the database changes should be applied
    And the migration should be recorded in the database

  Scenario: Prevent reapplying migrations
    Given a migration has already been applied
    When I check the migration status
    Then the migration should not be in the pending list

  Scenario: Handle migration failures gracefully
    Given an invalid migration file with syntax errors
    When I attempt to apply the migration
    Then the migration should fail
    And an error message should be recorded
    And the migration status should be "FAILED"

  Scenario: Apply multiple migrations in order
    Given three migration files exist in sequence
    When I run all pending migrations
    Then all three migrations should be applied successfully
    And they should be applied in the correct order
    And all database changes should be present

  Scenario: Support dry-run mode
    Given a migration file exists
    When I run migrations in dry-run mode
    Then the migration should be marked as applied in the result
    But no database changes should be made
    And no migration record should be created

  Scenario: Report migration status
    Given a pending migration exists
    When I check the migration status
    Then it should show 0 applied migrations
    And it should show 1 pending migration
    When I apply the migration
    And I check the migration status again
    Then it should show 1 applied migration
    And it should show 0 pending migrations
