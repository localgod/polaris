Feature: [contract] Technology Approvals API
  As a team member
  I want to set TIME approvals for technologies
  So that my team's technology usage is tracked and compliant

  Background:
    Given the API server is running

  Scenario: Team member sets approval for their own team
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"
    Then the response should be successful
    And the approval should be set with the correct parameters

  Scenario: Superuser sets approval for any team
    Given I am authenticated as a superuser
    When I request POST "/api/technologies/React/approvals" for "Other Team" with time "eliminate"
    Then the response should be successful

  Scenario: User not in team is rejected
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" for "Other Team" with time "invest"
    Then the request should be rejected with status 403

  Scenario: Missing teamName returns 400
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" without a teamName
    Then the request should be rejected with status 400

  Scenario: Missing time returns 400
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" without a time value
    Then the request should be rejected with status 400

  Scenario: Missing technology name param returns 400
    Given I am authenticated as a member of "Platform Team"
    When I request POST approvals without a technology name
    Then the request should be rejected with status 400

  Scenario: Unauthenticated request is rejected
    Given I am not authenticated
    When I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"
    Then the request should be rejected with status 401

  Scenario: URL-encoded technology name is decoded
    Given I am authenticated as a member of "Platform Team"
    When I request POST approvals for technology "My%20Tech"
    Then the approval should be set for technology "My Tech"

  Scenario: Team member sets environment-scoped approval
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" for "Platform Team" with time "eliminate" and environment "prod"
    Then the response should be successful
    And the approval should be set with environment "prod"

  Scenario: Blanket approval is set when environment is omitted
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"
    Then the response should be successful
    And the approval should be set with environment null

  Scenario: Invalid environment value returns 422
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" with invalid environment "production"
    Then the request should be rejected with status 422
