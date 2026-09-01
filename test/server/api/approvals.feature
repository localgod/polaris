Feature: [contract] Technology Approvals API — deprecated (ADR-0008)
  Team-level TIME approvals were replaced by org-level TechnologyPolicy.
  The endpoint now returns 410 Gone for all requests.

  Background:
    Given the API server is running

  Scenario: Any request to the approvals endpoint returns 410 Gone
    Given I am authenticated as a member of "Platform Team"
    When I request POST "/api/technologies/React/approvals" for "Platform Team" with time "invest"
    Then the request should be rejected with status 410
