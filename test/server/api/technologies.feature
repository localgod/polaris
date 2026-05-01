Feature: Technologies API
  As an API consumer
  I want to interact with the technologies endpoint
  So that I can manage technology approvals and lifecycle

  Background:
    Given the API server is running

  # GET /api/technologies

  Scenario: Successfully retrieve all technologies
    When I request GET "/api/technologies"
    Then the response should be successful
    And the response data should be an array
    And the response should include a total count

  Scenario: Pagination defaults to limit 50 and offset 0
    When I request GET "/api/technologies"
    Then the service should be called with limit 50 and offset 0

  Scenario: Limit is clamped to a maximum of 200
    When I request GET "/api/technologies" with limit 500
    Then the service should be called with limit 200 and offset 0

  Scenario: Limit is clamped to a minimum of 1
    When I request GET "/api/technologies" with limit -5
    Then the service should be called with limit 1 and offset 0

  Scenario: Non-integer limit is rejected
    When I request GET "/api/technologies" with limit "bad"
    Then the response should be unsuccessful
    And the response error should mention integers

  Scenario: Sort parameters are forwarded to the service
    When I request GET "/api/technologies" with sortBy "name" and sortOrder "desc"
    Then the service should be called with sortBy "name" and sortOrder "desc"

  Scenario: Service error returns error response
    When I request GET "/api/technologies" and the service throws an error "DB error"
    Then the response should be unsuccessful
    And the response error should be "DB error"

  # POST /api/technologies

  Scenario: Successfully create a new technology
    Given I am authenticated
    When I request POST "/api/technologies" with valid technology data
    Then the response should be successful
    And the response data should contain the created technology name

  Scenario: Unauthenticated request is rejected
    Given I am not authenticated
    When I request POST "/api/technologies" with valid technology data
    Then the request should be rejected with status 401

  Scenario: Conflict returns 409
    Given I am authenticated
    When I request POST "/api/technologies" with a duplicate technology name
    Then the request should be rejected with status 409

  Scenario: Unexpected service error returns 500
    Given I am authenticated
    When I request POST "/api/technologies" and the service throws an unexpected error
    Then the request should be rejected with status 500
