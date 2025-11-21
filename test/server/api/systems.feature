Feature: Systems API
  As an API consumer
  I want to manage systems
  So that I can track applications and services

  Scenario: Retrieve list of systems
    Given the API server is running
    When I request the list of systems
    Then I should receive a successful response
    And the response should contain an array of systems
    And the response should include a count field

  Scenario: Systems have required fields
    Given the API server is running
    And there are systems in the database
    When I request the list of systems
    Then each system should have a name
    And each system should have domain and owner information
    And each system should have business criticality
    And each system should have environment type
    And each system should have component and repository counts

  Scenario: Create a new system
    Given the API server is running
    When I create a new system with valid data
    Then I should receive a 201 created response
    And the response should contain the system name
    And the system should exist in the database

  Scenario: Prevent duplicate system creation
    Given the API server is running
    And a system already exists
    When I try to create a system with the same name
    Then I should receive a 409 conflict error

  Scenario: Validate business criticality values
    Given the API server is running
    When I try to create a system with invalid business criticality
    Then I should receive a 422 validation error
    And the error message should mention valid criticality values

  Scenario: Validate environment values
    Given the API server is running
    When I try to create a system with invalid environment
    Then I should receive a 422 validation error
    And the error message should mention valid environment values

  Scenario: Require all mandatory fields
    Given the API server is running
    When I try to create a system without required fields
    Then I should receive a 400 bad request error
    And the error message should mention missing fields
