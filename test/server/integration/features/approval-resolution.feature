Feature: Approval Resolution Logic
  As a system
  I want to resolve technology approval status using a clear priority hierarchy
  So that teams get consistent and predictable approval decisions

  Background:
    Given a Neo4j database is available
    And the following teams exist:
      | name           | email                    |
      | Backend Team   | backend@example.com      |
      | Frontend Team  | frontend@example.com     |
    And the following technologies exist:
      | name       | category   |
      | Java       | Language   |
      | Python     | Language   |
      | React      | Framework  |
    And the following versions exist:
      | technology | version |
      | Java       | 8       |
      | Java       | 11      |
      | Java       | 17      |
      | Java       | 21      |

  Scenario: Version-specific approval takes precedence over technology-level
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I resolve approval for "Backend Team" and "Java" version "8"
    Then the effective status should be "deprecated"
    And the resolution source should be "version-specific"

  Scenario: Technology-level approval applies when no version-specific approval exists
    Given the "Backend Team" approves "Java" with status "approved"
    When I resolve approval for "Backend Team" and "Java" version "17"
    Then the effective status should be "approved"
    And the resolution source should be "technology-level"

  Scenario: Default to restricted when no approval exists
    Given the "Backend Team" has no approval for "Python"
    When I resolve approval for "Backend Team" and "Python" version "3.11"
    Then the effective status should be "restricted"
    And the resolution source should be "default"

  Scenario: Version constraint evaluation for approved range
    Given the "Backend Team" approves "Java" with:
      | status            | approved |
      | versionConstraint | >=17     |
    When I resolve approval for "Backend Team" and "Java" version "17"
    And the effective status should be "approved"
    And the constraint ">=17" should be satisfied by version "17"
    When I resolve approval for "Backend Team" and "Java" version "21"
    And the effective status for version 21 should be "approved"
    And the constraint ">=17" should be satisfied by version "21"

  Scenario: Version constraint evaluation for restricted range
    Given the "Backend Team" approves "Java" with:
      | status            | approved |
      | versionConstraint | >=17     |
    When I resolve approval for "Backend Team" and "Java" version "11"
    And the effective status should be "restricted"
    And the constraint ">=17" should not be satisfied by version "11"
    When I resolve approval for "Backend Team" and "Java" version "8"
    And the effective status for version 8 should be "restricted"
    And the constraint ">=17" should not be satisfied by version "8"

  Scenario: Version-specific override of version constraint
    Given the "Backend Team" approves "Java" with:
      | status            | approved |
      | versionConstraint | >=17     |
    And the "Backend Team" approves "Java" version "11" with status "experimental"
    When I resolve approval for "Backend Team" and "Java" version "11"
    Then the effective status should be "experimental"
    And the resolution source should be "version-specific"
    And the version constraint should be ignored

  Scenario: Multiple resolution paths with priority
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I resolve approval for "Backend Team" and "Java" version "8"
    Then the resolution should check in order:
      | priority | source           | result     |
      | 1        | version-specific | deprecated |
      | 2        | technology-level | approved   |
      | 3        | default          | restricted |
    And the effective status should be "deprecated"

  Scenario: Resolution includes metadata from source
    Given the "Backend Team" approves "Java" version "8" with:
      | status          | deprecated |
      | eolDate         | 2025-06-30 |
      | migrationTarget | Java 17    |
      | notes           | Security concerns |
    When I resolve approval for "Backend Team" and "Java" version "8"
    Then the effective status should be "deprecated"
    And the resolution should include:
      | eolDate         | 2025-06-30        |
      | migrationTarget | Java 17           |
      | notes           | Security concerns |

  Scenario: Technology-level restricted overrides version constraint
    Given the "Backend Team" approves "Java" with:
      | status            | restricted |
      | notes             | Use TypeScript instead |
    When I resolve approval for "Backend Team" and "Java" version "17"
    Then the effective status should be "restricted"
    And the notes should be "Use TypeScript instead"

  Scenario: Experimental status allows usage with warnings
    Given the "Backend Team" approves "React" version "19.0.0-beta" with:
      | status | experimental |
      | notes  | Beta version - use with caution |
    When I resolve approval for "Backend Team" and "React" version "19.0.0-beta"
    Then the effective status should be "experimental"
    And the resolution should indicate "use with caution"

  Scenario: Resolution for multiple teams shows different results
    Given the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Frontend Team" approves "Java" with status "restricted"
    When I resolve approval for "Backend Team" and "Java" version "17"
    Then the effective status should be "approved"
    When I resolve approval for "Frontend Team" and "Java" version "17"
    Then the effective status should be "restricted"

  Scenario: Complex version constraint with multiple operators
    Given the "Backend Team" approves "Java" with:
      | status            | approved |
      | versionConstraint | >=11 <21 |
    When I resolve approval for "Backend Team" and "Java" version "11"
    Then the effective status should be "approved"
    When I resolve approval for "Backend Team" and "Java" version "17"
    And the effective status should be "approved"
    When I resolve approval for "Backend Team" and "Java" version "21"
    Then the effective status should be "restricted"
    When I resolve approval for "Backend Team" and "Java" version "8"
    And the effective status should be "restricted"

  Scenario: Resolution caching and performance
    Given the "Backend Team" approves "Java" with status "approved"
    When I resolve approval for "Backend Team" and "Java" version "17" 100 times
    Then all resolutions should return "approved"
    And the resolution should be efficient

  Scenario: Audit trail for resolution decisions
    Given the "Backend Team" approves "Java" version "8" with:
      | status     | deprecated |
      | approvedBy | John Doe   |
      | approvedAt | 2024-01-01 |
    When I resolve approval for "Backend Team" and "Java" version "8"
    Then the resolution should include audit information:
      | approvedBy | John Doe   |
      | approvedAt | 2024-01-01 |
    And the resolution timestamp should be recorded

  Scenario: Resolution with missing version node
    Given the "Backend Team" approves "Java" with status "approved"
    And version "22" does not exist for "Java"
    When I resolve approval for "Backend Team" and "Java" version "22"
    Then the effective status should be "approved"
    And the resolution source should be "technology-level"
    And a warning should indicate "version not found in catalog"
