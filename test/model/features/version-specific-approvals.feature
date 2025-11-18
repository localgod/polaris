Feature: Version-Specific Technology Approvals
  As a technology governance team
  I want teams to approve or restrict specific versions of technologies
  So that teams can enforce version policies and manage migrations

  Scenario: Team approves specific versions only
    Given a Neo4j database is available
    And the "Backend Team" approves "Java" version "17" with status "approved"
    And the "Backend Team" approves "Java" version "11" with status "deprecated"
    When I query "Backend Team" approval for "Java" version "17"
    Then the status should be "approved"
    When I query "Backend Team" approval for "Java" version "11"
    Then the status should be "deprecated"

  Scenario: Different teams approve different versions of same technology
    Given a Neo4j database is available
    And the "Backend Team" approves "Node.js" version "18" with status "approved"
    And the "Frontend Team" approves "Node.js" version "16" with status "approved"
    When I query "Backend Team" approval for "Node.js" version "18"
    Then the Backend Team status should be "approved"
    When I query "Frontend Team" approval for "Node.js" version "16"
    Then the Frontend Team status should be "approved"

  Scenario: Version-specific approval overrides technology-level approval
    Given a Neo4j database is available
    And the "Backend Team" approves "Java" with status "approved"
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    When I query "Backend Team" approval for "Java" version "8"
    Then the status should be "deprecated"
    When I query "Backend Team" approval for "Java" version "17"
    Then the status should be "approved"

  Scenario: Find systems using deprecated versions
    Given a Neo4j database is available
    And the "Backend Team" approves "Java" version "8" with status "deprecated"
    And system "Legacy API" uses "Java" version "8"
    When I query systems using deprecated versions
    Then "Legacy API" should be in the results
