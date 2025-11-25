Feature: Components API
  As a client application
  I want to retrieve component data via the API
  So that I can display SBOM information to users

  Background:
    Given the API server is running

  @api
  Scenario: Successfully retrieve all components
    When I request GET "/api/components"
    Then the response status should be 200
    And the response should have content type "application/json"
    And the response should match the ApiResponse schema
    And the response should have property "success" equal to true
    And the response should have property "data" as an array
    And the response should have property "count" as a number

  @api
  Scenario: Components response includes required fields
    Given the database contains component data
    When I request GET "/api/components"
    Then the response status should be 200
    And each component in "data" should have the following properties:
      | property        | type   |
      | name            | string |
      | version         | string |
      | packageManager  | any    |
      | purl            | any    |
      | type            | any    |
      | hashes          | array  |
      | licenses        | array  |

  @api
  Scenario: Empty database returns valid empty response
    Given the database is empty
    When I request GET "/api/components"
    Then the response status should be 200
    And the response should have property "success" equal to true
    And the response should have property "data" as an array
    And the response should have property "count" equal to 0
    And the "data" array should be empty

  @api
  Scenario: API handles database errors gracefully
    Given the database connection fails
    When I request GET "/api/components"
    Then the response status should be 200
    And the response should have property "success" as a boolean
    And the response should have property "data" as an array
    And if success is false, response should have property "error" as a string
    And if success is false, the "data" array should be empty
