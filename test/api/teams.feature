Feature: Teams API
  As an API consumer
  I want to manage teams
  So that I can track teams and their responsibilities

  Scenario: Retrieve list of teams
    Given the API server is running
    When I request the list of teams
    Then I should receive a successful response
    And the response should contain an array of teams
    And the response should have a count property

  Scenario: Teams have required fields
    Given the API server is running
    When I request the list of teams
    Then each team should have required fields

  Scenario: Get team technology usage
    Given the API server is running
    And I know a team name
    When I request the team usage
    Then I should receive usage data
    And the response should include team name
    And the response should include usage array
    And the response should include summary statistics
