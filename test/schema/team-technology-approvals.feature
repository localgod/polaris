Feature: Team-Specific Technology Approvals
  As a technology governance team
  I want teams to have independent approval policies for technologies
  So that different teams can adopt or deprecate technologies based on their needs

  Background:
    Given a Neo4j database is available
    And the following teams exist:
      | name           | email                    | responsibilityArea |
      | Backend Team   | backend@example.com      | Backend Services   |
      | Frontend Team  | frontend@example.com     | User Interfaces    |
      | DevOps Team    | devops@example.com       | Infrastructure     |
    And the following technologies exist:
      | name       | category   | description                    |
      | Java       | Language   | Object-oriented programming    |
      | TypeScript | Language   | Typed JavaScript superset      |
      | Docker     | Platform   | Container platform             |

  Scenario: Different teams approve the same technology
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" approves "Java" with status "restricted"
    When I query technology approvals for "Java"
    Then "Backend Team" should have approval status "approved" for "Java"
    And "Frontend Team" should have approval status "restricted" for "Java"

  Scenario: Team deprecates a technology while another team keeps it approved
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" approves "Java" with status "approved"
    When the "Frontend Team" changes "Java" approval to "deprecated" with EOL date "2025-12-31"
    Then "Backend Team" should have approval status "approved" for "Java"
    And "Frontend Team" should have approval status "deprecated" for "Java"
    And "Frontend Team" approval for "Java" should have EOL date "2025-12-31"

  Scenario: Team sets migration target when deprecating technology
    Given the "Frontend Team" approves "Java" with status "approved"
    When the "Frontend Team" deprecates "Java" with migration target "TypeScript"
    Then "Frontend Team" approval for "Java" should have status "deprecated"
    And "Frontend Team" approval for "Java" should have migration target "TypeScript"

  Scenario: Track approval metadata
    Given the "Backend Team" approves "Java" with:
      | status      | approved              |
      | approvedBy  | John Doe              |
      | notes       | Standard for services |
    Then "Backend Team" approval for "Java" should have:
      | status      | approved              |
      | approvedBy  | John Doe              |
      | notes       | Standard for services |
    And "Backend Team" approval for "Java" should have an "approvedAt" timestamp

  Scenario: Multiple teams with different approval statuses
    Given the "Backend Team" approves "Docker" with status "approved"
    And the "Frontend Team" approves "Docker" with status "experimental"
    And the "DevOps Team" approves "Docker" with status "approved"
    When I query all team approvals for "Docker"
    Then I should see 3 team approvals for "Docker"
    And 2 teams should have status "approved" for "Docker"
    And 1 team should have status "experimental" for "Docker"

  Scenario: Team with no approval defaults to restricted
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" has no approval for "Java"
    When I query "Frontend Team" approval for "Java"
    Then the effective status should be "restricted"

  Scenario: Update approval status over time
    Given the "Backend Team" approves "Java" with status "approved" on "2024-01-01"
    When the "Backend Team" changes "Java" approval to "deprecated" on "2025-01-01"
    Then "Backend Team" approval for "Java" should have status "deprecated"
    And "Backend Team" approval for "Java" should have "approvedAt" date "2024-01-01"
    And "Backend Team" approval for "Java" should have "deprecatedAt" date "2025-01-01"

  Scenario: Find technologies with conflicting approvals
    Given the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" approves "Java" with status "deprecated"
    And the "DevOps Team" approves "Java" with status "approved"
    When I query technologies with conflicting approval statuses
    Then "Java" should appear in the results
    And "Java" should show 2 teams with "approved" status
    And "Java" should show 1 team with "deprecated" status
