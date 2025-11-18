Feature: Team-Specific Technology Approvals
  As a technology governance team
  I want teams to have independent approval policies for technologies
  So that different teams can adopt or deprecate technologies based on their needs

  Scenario: Different teams approve the same technology
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
    And the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" approves "Java" with status "restricted"
    When I query technology approvals for "Java"
    Then "Backend Team" should have approval status "approved" for "Java"
    And "Frontend Team" should have approval status "restricted" for "Java"

  Scenario: Team deprecates a technology while another team keeps it approved
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
    And the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" approves "Java" with status "approved"
    When the "Frontend Team" changes "Java" approval to "deprecated" with EOL date "2025-12-31"
    Then "Backend Team" should have approval status "approved" for "Java"
    And "Frontend Team" should have approval status "deprecated" for "Java"
    And "Frontend Team" approval for "Java" should have EOL date "2025-12-31"

  Scenario: Team with no approval defaults to restricted
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
    And the "Backend Team" approves "Java" with status "approved"
    And the "Frontend Team" has no approval for "Java"
    When I query "Frontend Team" approval for "Java"
    Then the effective status should be "restricted"
