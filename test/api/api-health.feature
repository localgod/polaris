Feature: API Health Check
  As a system administrator
  I want to check the health endpoint
  So that I can ensure the system is operational

  Scenario: Health endpoint returns a response
    Given the API server is running
    When I request the health endpoint
    Then I should receive a response
    And the response should have a status field
    And the response should have a database field
    And the response should have a timestamp field

  Scenario: Health endpoint returns valid status
    Given the API server is running
    When I request the health endpoint
    Then the status field should be either "healthy" or "unhealthy"
