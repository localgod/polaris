Feature: SBOM Validation API
  As a client application
  I want to submit and validate SBOMs via the API
  So that I can ensure SBOM documents are valid before processing

  Background:
    Given the API server is running

  @api
  Scenario: Successfully validate a CycloneDX SBOM
    Given I am authenticated
    When I POST to "/api/sboms" with valid CycloneDX SBOM
    Then the response status should be 200
    And the response should have property "success" equal to true
    And the response should have property "format" equal to "cyclonedx"
    And the response should have property "message" equal to "Valid SBOM"

  @api
  Scenario: Successfully validate an SPDX SBOM
    Given I am authenticated
    When I POST to "/api/sboms" with valid SPDX SBOM
    Then the response status should be 200
    And the response should have property "success" equal to true
    And the response should have property "format" equal to "spdx"
    And the response should have property "message" equal to "Valid SBOM"

  @api
  Scenario: Reject request without authentication
    Given I am not authenticated
    When I POST to "/api/sboms" with valid CycloneDX SBOM
    Then the response status should be 401
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "unauthenticated"
    And the response should have property "message" equal to "Authentication required"

  @api
  Scenario: Reject request with wrong Content-Type
    Given I am authenticated
    When I POST to "/api/sboms" with Content-Type "text/plain"
    Then the response status should be 415
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "unsupported_media_type"
    And the response should have property "required" equal to "application/json"

  @api
  Scenario: Reject request with invalid JSON
    Given I am authenticated
    When I POST to "/api/sboms" with invalid JSON
    Then the response status should be 400
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "invalid_request"
    And the response should have property "message" equal to "Invalid JSON in request body"

  @api
  Scenario: Reject request without repositoryUrl
    Given I am authenticated
    When I POST to "/api/sboms" without repositoryUrl
    Then the response status should be 400
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "invalid_request"
    And the response should have property "message" equal to "repositoryUrl is required"

  @api
  Scenario: Reject request with invalid repositoryUrl
    Given I am authenticated
    When I POST to "/api/sboms" with invalid repositoryUrl
    Then the response status should be 400
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "invalid_request"
    And the response should have property "message" equal to "repositoryUrl must be a valid URL"

  @api
  Scenario: Reject request without SBOM
    Given I am authenticated
    When I POST to "/api/sboms" without sbom
    Then the response status should be 400
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "invalid_request"
    And the response should have property "message" equal to "sbom is required"

  @api
  Scenario: Reject invalid SBOM schema
    Given I am authenticated
    When I POST to "/api/sboms" with invalid SBOM schema
    Then the response status should be 422
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "invalid_sbom"
    And the response should have property "format" as a string
    And the response should have property "validationErrors" as an array

  @api
  Scenario: Handle internal validation errors
    Given I am authenticated
    When the SBOM validator throws an error
    Then the response status should be 500
    And the response should have property "success" equal to false
    And the response should have property "error" equal to "internal_error"
    And the response should have property "message" as a string
