Feature: Systems API
  As an API consumer
  I want to interact with the systems endpoint
  So that I can manage system information

  Background:
    Given the API server is running

  Scenario: Successfully retrieve all systems
    When I request GET "/api/systems"
    Then the response status should be 200
    And the response should have content type "application/json"
    And the response should match the ApiResponse schema
    And the response should contain "success" field with value true
    And the response should contain "data" field as an array
    And the response should contain "count" field as a number
    And each system in the response should have required fields

  Scenario: Successfully create a new system
    When I request POST "/api/systems" with valid system data
    Then the response status should be 201
    And the response should have content type "application/json"
    And the response should match the ApiResponse schema
    And the response should contain "success" field with value true
    And the response should contain "data" field with the created system
    And the response should contain "count" field with value 1

  Scenario: Fail to create system with missing required fields
    When I request POST "/api/systems" with missing required fields
    Then the response status should be 400
    And the response should contain "success" field with value false
    And the response should contain an error message

  Scenario: Fail to create system with invalid field values
    When I request POST "/api/systems" with invalid field values
    Then the response status should be 422
    And the response should contain "success" field with value false
    And the response should contain an error message

  Scenario: Fail to create duplicate system
    When I request POST "/api/systems" with a duplicate system name
    Then the response status should be 409
    And the response should contain "success" field with value false
    And the response should contain an error message about duplicate
