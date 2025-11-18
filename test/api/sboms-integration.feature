Feature: SBOM API Endpoint
  As an API consumer
  I want to submit SBOMs for validation
  So that I can ensure my SBOMs are correctly formatted

  Background:
    Given the API server is running

  Scenario: Reject requests without Content-Type header
    When I POST to "/api/sboms" without Content-Type header
    Then I should receive a 415 status code
    And the response should indicate unsupported media type
    And the response should specify "application/json" is required

  Scenario: Reject requests with wrong Content-Type
    When I POST to "/api/sboms" with Content-Type "text/plain"
    Then I should receive a 415 status code
    And the response should indicate unsupported media type

  Scenario: Reject unauthenticated requests
    Given I have a valid SBOM payload
    When I POST to "/api/sboms" without authentication
    Then I should receive a 401 status code
    And the response should indicate authentication is required

  Scenario: Reject requests with invalid Bearer token
    Given I have a valid SBOM payload
    When I POST to "/api/sboms" with an invalid Bearer token
    Then I should receive a 401 status code
    And the response should indicate authentication failed

  Scenario: Validate CycloneDX SBOM with valid authentication
    Given I have a valid API token
    And I have a valid CycloneDX 1.6 SBOM
    When I POST the SBOM to "/api/sboms" with authentication
    Then I should receive a 200 status code
    And the response should indicate success
    And the response should identify the format as "cyclonedx"

  Scenario: Validate SPDX SBOM with valid authentication
    Given I have a valid API token
    And I have a valid SPDX 2.3 SBOM
    When I POST the SBOM to "/api/sboms" with authentication
    Then I should receive a 200 status code
    And the response should indicate success
    And the response should identify the format as "spdx"

  Scenario: Reject invalid SBOM schema
    Given I have a valid API token
    And I have an invalid CycloneDX SBOM missing required fields
    When I POST the SBOM to "/api/sboms" with authentication
    Then I should receive a 422 status code
    And the response should indicate validation failed
    And the response should include validation errors

  Scenario: Reject unknown SBOM format
    Given I have a valid API token
    And I have an unrecognized SBOM format
    When I POST the SBOM to "/api/sboms" with authentication
    Then I should receive a 422 status code
    And the response should indicate unknown format

  Scenario: Fast-fail on authentication before validation
    Given I have a large SBOM payload
    When I POST to "/api/sboms" without authentication
    Then I should receive a 401 status code
    And the response time should be less than 1 second
