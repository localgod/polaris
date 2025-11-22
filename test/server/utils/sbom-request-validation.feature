Feature: SBOM Request Validation
  As a developer
  I want to validate SBOM API request parameters
  So that invalid requests are rejected before processing

  Background:
    Given the SBOM request validator is initialized

  Scenario: Validate missing repositoryUrl
    Given a request body without repositoryUrl
    When I validate the request
    Then the validation should fail
    And the error should indicate repositoryUrl is required

  Scenario: Validate non-string repositoryUrl
    Given a request body with repositoryUrl as a number
    When I validate the request
    Then the validation should fail
    And the error should indicate repositoryUrl must be a string

  Scenario: Validate invalid URL format
    Given a request body with repositoryUrl "not-a-valid-url"
    When I validate the request
    Then the validation should fail
    And the error should indicate repositoryUrl must be a valid URL

  Scenario: Validate valid repositoryUrl
    Given a request body with repositoryUrl "https://github.com/test/repo"
    When I validate the repositoryUrl
    Then the validation should succeed

  Scenario: Validate missing SBOM
    Given a request body without sbom field
    When I validate the request
    Then the validation should fail
    And the error should indicate sbom is required

  Scenario: Validate non-object SBOM
    Given a request body with sbom as a string
    When I validate the request
    Then the validation should fail
    And the error should indicate sbom must be an object

  Scenario: Validate null SBOM
    Given a request body with sbom as null
    When I validate the request
    Then the validation should fail
    And the error should indicate sbom must be an object

  Scenario: Validate valid SBOM structure
    Given a request body with a valid SBOM object
    When I validate the SBOM structure
    Then the validation should succeed

  Scenario: Validate complete valid request
    Given a request body with valid repositoryUrl and SBOM
    When I validate the complete request
    Then the validation should succeed
    And no errors should be present
