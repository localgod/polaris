Feature: Systems API
  As an API consumer
  I want to interact with the systems endpoint
  So that I can manage system information

  Background:
    Given the API server is running

  # GET /api/systems

  Scenario: Successfully retrieve all systems
    When I request GET "/api/systems"
    Then the response should be successful
    And the response data should be an array
    And the response should include a total count

  Scenario: Pagination defaults to limit 50 and offset 0
    When I request GET "/api/systems"
    Then the service should be called with limit 50 and offset 0

  Scenario: Limit is clamped to a maximum of 200
    When I request GET "/api/systems" with limit 9999
    Then the service should be called with limit 200 and offset 0

  Scenario: Limit is clamped to a minimum of 1
    When I request GET "/api/systems" with limit 0
    Then the service should be called with limit 1 and offset 0

  Scenario: Non-integer limit is rejected
    When I request GET "/api/systems" with limit "abc"
    Then the response should be unsuccessful
    And the response error should mention integers

  Scenario: Service error returns error response
    When I request GET "/api/systems" and the service throws an error "DB down"
    Then the response should be unsuccessful
    And the response error should be "DB down"

  # POST /api/systems

  Scenario: Successfully create a new system
    Given I am authenticated
    When I request POST "/api/systems" with valid system data
    Then the response should be successful
    And the response data should contain the created system name

  Scenario: Unauthenticated request is rejected
    Given I am not authenticated
    When I request POST "/api/systems" with valid system data
    Then the request should be rejected with status 401

  Scenario: Conflict returns 409
    Given I am authenticated
    When I request POST "/api/systems" with a duplicate system name
    Then the request should be rejected with status 409

  Scenario: Unexpected service error returns 500
    Given I am authenticated
    When I request POST "/api/systems" and the service throws an unexpected error
    Then the request should be rejected with status 500
