# Feature: Technology Usage Tracking
#
# Track actual technology usage by teams (inferred from system ownership)
# and enable compliance checking against approval policies.

Feature: Technology Usage Tracking

  Background:
    Given a Neo4j database is available
    And the database has been seeded with test data

  Scenario: Team USES relationship is created from system ownership
    Given a team "Frontend Platform" owns a system "Customer Portal"
    And the system "Customer Portal" uses component "react@18.2.0"
    And the component "react@18.2.0" is a version of technology "React"
    When the USES relationships are created
    Then the team "Frontend Platform" should have a USES relationship to "React"
    And the USES relationship should have property "systemCount" equal to 1

  Scenario: USES relationship tracks multiple systems
    Given a team "Backend Platform" owns systems "API Gateway" and "Auth Service"
    And both systems use components that are versions of "Node.js"
    When the USES relationships are created
    Then the team "Backend Platform" should have a USES relationship to "Node.js"
    And the USES relationship should have property "systemCount" equal to 2

  Scenario: Find teams using unapproved technologies
    Given a team "Data Platform" uses technology "Python"
    But the team "Data Platform" has not approved "Python"
    When I query for compliance violations
    Then "Data Platform" should appear in the violations list
    And the violation type should be "unapproved"

  Scenario: Find teams using eliminated technologies
    Given a team "Frontend Platform" uses technology "Angular"
    And the team "Frontend Platform" has approved "Angular" with time "eliminate"
    When I query for compliance violations
    Then "Frontend Platform" should appear in the violations list
    And the violation type should be "eliminated"

  Scenario: Compliant usage is not flagged as violation
    Given a team "Backend Platform" uses technology "TypeScript"
    And the team "Backend Platform" has approved "TypeScript" with time "invest"
    When I query for compliance violations
    Then "Backend Platform" should not appear in the violations list

  Scenario: Query team usage with compliance status
    Given a team "Frontend Platform" uses multiple technologies
    And some are approved and some are not
    When I query the team's usage
    Then I should see all used technologies
    And each should have a compliance status
    And the summary should show counts by compliance status
