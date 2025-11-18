Feature: Version-Specific Technology Approvals
  As a technology governance team
  I want teams to approve or restrict specific versions of technologies
  So that teams can enforce version policies and manage migrations

  Background:
    Given a Neo4j database is available
    And the following teams exist:
      | name           | email                    |
      | Backend Team   | backend@example.com      |
      | Frontend Team  | frontend@example.com     |
    And the following technologies exist:
      | name       | category   |
      | Java       | Language   |
      | Node.js    | Runtime    |
    And the following versions exist:
      | technology | version | releaseDate |
      | Java       | 8       | 2014-03-18  |
      | Java       | 11      | 2018-09-25  |
      | Java       | 17      | 2021-09-14  |
      | Java       | 21      | 2023-09-19  |
      | Node.js    | 16      | 2021-04-20  |
      | Node.js    | 18      | 2022-04-19  |
      | Node.js    | 20      | 2023-04-18  |

  Scenario: Team approves specific versions only
    Given the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Backend Team" approves "Java" version "21" with status "approved"
    When I query "Backend Team" approvals for "Java"
    Then "Java" version "17" should have status "approved"
    And "Java" version "21" should have status "approved"
    And "Java" version "11" should have status "restricted"
    And "Java" version "8" should have status "restricted"

  Scenario: Team deprecates old versions while approving new ones
    Given the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Backend Team" approves "Java" version "11" with status "deprecated"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I query deprecated versions for "Backend Team"
    Then I should see "Java" version "11" with status "deprecated"
    And I should see "Java" version "8" with status "deprecated"
    But I should not see "Java" version "17" with status "deprecated"

  Scenario: Different teams approve different versions of same technology
    Given the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Backend Team" approves "Java" version "21" with status "approved"
    And the "Frontend Team" approves "Java" with status "restricted"
    When I check "Java" version "17" approval for "Backend Team"
    Then the status should be "approved"
    When I check "Java" version "17" approval for "Frontend Team"
    Then the status should be "restricted"

  Scenario: Set EOL date for deprecated version
    Given the "Backend Team" approves "Java" version "8" with:
      | status         | deprecated  |
      | eolDate        | 2025-06-30  |
      | migrationTarget| Java 17     |
    Then "Backend Team" approval for "Java" version "8" should have:
      | status         | deprecated  |
      | eolDate        | 2025-06-30  |
      | migrationTarget| Java 17     |

  Scenario: Find systems using deprecated versions
    Given the "Backend Team" owns system "payment-service"
    And system "payment-service" uses component "java:8"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I query systems using deprecated versions for "Backend Team"
    Then I should see "payment-service" using "Java" version "8"
    And the status should be "deprecated"

  Scenario: Version-specific approval overrides technology-level approval
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I check "Java" version "8" approval for "Backend Team"
    Then the effective status should be "deprecated"
    When I check "Java" version "17" approval for "Backend Team"
    Then the effective status should be "approved"

  Scenario: Track multiple version deprecations with different EOL dates
    Given the "Backend Team" approves "Java" version "8" with:
      | status  | deprecated |
      | eolDate | 2025-06-30 |
    And the "Backend Team" approves "Java" version "11" with:
      | status  | deprecated |
      | eolDate | 2025-12-31 |
    When I query deprecated versions ordered by EOL date
    Then "Java" version "8" should have EOL date "2025-06-30"
    And "Java" version "11" should have EOL date "2025-12-31"
    And "Java" version "8" should appear before "Java" version "11"

  Scenario: Version constraint for range-based approval
    Given the "Backend Team" approves "Java" with:
      | status            | approved |
      | versionConstraint | >=17     |
    When I check if "Java" version "17" satisfies "Backend Team" constraints
    Then the version should be approved
    When I check if "Java" version "21" satisfies "Backend Team" constraints
    Then the version should be approved
    When I check if "Java" version "11" satisfies "Backend Team" constraints
    Then the version should be restricted

  Scenario: Find all teams approving a specific version
    Given the "Backend Team" approves "Node.js" version "18" with status "approved"
    And the "Frontend Team" approves "Node.js" version "18" with status "approved"
    When I query teams approving "Node.js" version "18"
    Then I should see 2 teams
    And "Backend Team" should be in the results
    And "Frontend Team" should be in the results

  Scenario: Version approval with migration path
    Given the "Backend Team" approves "Java" version "8" with:
      | status          | deprecated |
      | eolDate         | 2025-06-30 |
      | migrationTarget | Java 17    |
      | notes           | Migrate all services to Java 17 LTS |
    When I query migration requirements for "Backend Team"
    Then I should see "Java" version "8" needs migration to "Java 17"
    And the EOL date should be "2025-06-30"
    And the notes should include "Migrate all services to Java 17 LTS"

  Scenario: Check version compliance for team systems
    Given the "Backend Team" owns system "user-service"
    And the "Backend Team" owns system "payment-service"
    And system "user-service" uses component "java:17"
    And system "payment-service" uses component "java:8"
    And the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I check version compliance for "Backend Team"
    Then "user-service" should be compliant
    And "payment-service" should be non-compliant
    And "payment-service" should need migration from "Java 8" to "Java 17"
