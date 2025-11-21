Feature: API Health Check
  As a system administrator
  I want to check the database status
  So that I can ensure the system is operational

  Scenario: Database status endpoint returns a response
    Given the API server is running
    When I request the database status endpoint
    Then I should receive a response
    And the response should have a status field
    And the response should have a message field

  Scenario: Database status endpoint returns valid status
    Given the API server is running
    When I request the database status endpoint
    Then the status field should be either "online" or "offline"
