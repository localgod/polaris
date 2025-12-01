Feature: Audit Trail Schema @model @unit
  As a compliance officer
  I need to track all data changes
  So that I can maintain audit trails for security and compliance

  Background:
    Given a clean Neo4j database
    And the audit trail schema is applied

  Scenario: Creating an audit log entry
    When I create an audit log with:
      | field        | value                           |
      | operation    | CREATE                          |
      | entityType   | Technology                      |
      | entityId     | React                           |
      | userId       | user123                         |
      | source       | UI                              |
    Then the audit log should be created successfully
    And the audit log should have a unique ID
    And the audit log should have a timestamp

  Scenario: Tracking field changes
    When I create an audit log with field changes:
      | field         | before        | after         |
      | status        | draft         | active        |
      | ownerTeam     | Frontend      | Platform      |
    Then the audit log should contain the field changes
    And the changedFields list should contain "status" and "ownerTeam"

  Scenario: Linking audit log to user
    Given a user "user123" exists
    When I create an audit log performed by "user123"
    Then the audit log should be linked to the user via PERFORMED_BY relationship
    And I can query all audit logs by that user

  Scenario: Querying audit logs by entity
    Given multiple audit logs exist for "React" technology
    When I query audit logs for entity type "Technology" and ID "React"
    Then I should receive all audit logs for that entity
    And the logs should be ordered by timestamp descending

  Scenario: Querying audit logs by operation type
    Given audit logs exist with various operations
    When I query audit logs with operation "APPROVE"
    Then I should only receive audit logs with operation "APPROVE"

  Scenario: Querying audit logs by time range
    Given audit logs exist from the past 30 days
    When I query audit logs from the last 7 days
    Then I should only receive logs from the last 7 days

  Scenario: Recording approval operations
    When I create an audit log for an approval:
      | field          | value                           |
      | operation      | APPROVE                         |
      | entityType     | Technology                      |
      | entityId       | React                           |
      | userId         | user123                         |
      | timeCategory   | invest                          |
    Then the audit log should capture the approval details
    And the metadata should include the TIME category

  Scenario: Recording SBOM operations
    When I create an audit log for SBOM upload:
      | field              | value                           |
      | operation          | SBOM_UPLOAD                     |
      | entityType         | System                          |
      | entityId           | API Gateway                     |
      | userId             | system                          |
      | source             | SBOM                            |
      | componentCount     | 150                             |
    Then the audit log should capture the SBOM details
    And the metadata should include component count

  Scenario: Using session and correlation IDs
    When I create multiple audit logs with the same sessionId
    Then I should be able to query all logs for that session
    And the logs should be grouped together

  Scenario: Filtering by source
    Given audit logs exist from different sources
    When I query audit logs from source "UI"
    Then I should only receive logs from the UI source

  Scenario: Tagging audit logs
    When I create an audit log with tags:
      | tag        |
      | security   |
      | critical   |
      | compliance |
    Then the audit log should have the specified tags
    And I can query audit logs by tag

  Scenario: Composite index performance
    Given 1000 audit logs exist for various entities
    When I query audit logs for a specific entity with time range
    Then the query should use the composite index
    And the query should complete in reasonable time

  Scenario: Audit log uniqueness
    When I create an audit log with ID "audit-123"
    And I try to create another audit log with ID "audit-123"
    Then the second creation should fail due to unique constraint

  Scenario: Recording complete state changes
    When I create an audit log with previousState and currentState
    Then I can compare the complete before and after states
    And I can identify all differences between states

  Scenario: Capturing user context
    When I create an audit log with user context:
      | field      | value                           |
      | ipAddress  | 192.168.1.100                   |
      | userAgent  | Mozilla/5.0...                  |
      | sessionId  | session-abc-123                 |
    Then the audit log should include the user context
    And I can analyze access patterns by IP address
