Feature: SBOM Validator
  As a developer
  I want to validate SBOM documents
  So that I can ensure they conform to CycloneDX or SPDX standards

  Background:
    Given the SBOM validator is initialized

  Scenario: Initialize successfully
    When I check if it is initialized
    Then it should return true

  Scenario: Not re-initialize if already initialized
    When I initialize again
    Then it should not throw an error
    And it should still be initialized

  Scenario: Detect CycloneDX format
    Given a CycloneDX SBOM document
    When I detect the format
    Then it should identify as "cyclonedx"

  Scenario: Detect SPDX format
    Given an SPDX SBOM document
    When I detect the format
    Then it should identify as "spdx"

  Scenario: Detect unknown format
    Given an unknown format SBOM document
    When I detect the format
    Then it should identify as "unknown"

  Scenario: Validate valid CycloneDX SBOM
    Given a valid CycloneDX SBOM document
    When I validate the SBOM
    Then the validation should succeed
    And the format should be "cyclonedx"

  Scenario: Validate valid SPDX SBOM
    Given a valid SPDX SBOM document
    When I validate the SBOM
    Then the validation should succeed
    And the format should be "spdx"

  Scenario: Reject invalid CycloneDX SBOM
    Given an invalid CycloneDX SBOM document
    When I validate the SBOM
    Then the validation should fail
    And the format should be "cyclonedx"
    And validation errors should be present

  Scenario: Reject invalid SPDX SBOM
    Given an invalid SPDX SBOM document
    When I validate the SBOM
    Then the validation should fail
    And the format should be "spdx"
    And validation errors should be present

  Scenario: Reject unknown format SBOM
    Given an unknown format SBOM document
    When I validate the SBOM
    Then the validation should fail
    And the format should be "unknown"

  Scenario: Handle empty SBOM
    Given an empty SBOM document
    When I validate the SBOM
    Then the validation should fail
    And the format should be "unknown"

  Scenario: Handle null SBOM
    Given a null SBOM document
    When I validate the SBOM
    Then the validation should fail
    And the format should be "unknown"

  Scenario: Validate CycloneDX with components
    Given a CycloneDX SBOM with components
    When I validate the SBOM
    Then the validation should succeed
    And the format should be "cyclonedx"

  Scenario: Validate SPDX with packages
    Given an SPDX SBOM with packages
    When I validate the SBOM
    Then the validation should succeed
    And the format should be "spdx"

  Scenario: Reject CycloneDX with invalid component structure
    Given a CycloneDX SBOM with invalid component structure
    When I validate the SBOM
    Then the validation should fail
    And validation errors should include component errors

  Scenario: Reject SPDX with invalid package structure
    Given an SPDX SBOM with invalid package structure
    When I validate the SBOM
    Then the validation should fail
    And validation errors should include package errors

  Scenario: Validate CycloneDX with metadata
    Given a CycloneDX SBOM with metadata
    When I validate the SBOM
    Then the validation should succeed

  Scenario: Validate SPDX with creation info
    Given an SPDX SBOM with creation info
    When I validate the SBOM
    Then the validation should succeed

  Scenario: Return singleton instance
    When I get the validator instance twice
    Then both instances should be the same
