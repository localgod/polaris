Feature: Unmapped Components API
  As an API consumer
  I want to retrieve components that are not mapped to technologies
  So that I can identify and categorize them

  Scenario: Retrieve all unmapped components
    Given the API server is running
    When I request all unmapped components
    Then I should receive a successful response
    And the response should contain an array of components
    And the response should include a count field

  Scenario: Unmapped components have required fields
    Given the API server is running
    And there are unmapped components in the database
    When I request all unmapped components
    Then each component should have a name
    And each component should have a version
    And each component should have a package manager
    And each component should have SBOM fields
    And each component should have relationship fields

  Scenario: Retrieve unmapped components for a specific system
    Given the API server is running
    And there is at least one system in the database
    When I request unmapped components for that system
    Then I should receive a successful response
    And the response should contain the system name
    And the response should contain an array of components
    And the response should include a count field

  Scenario: Handle non-existent system
    Given the API server is running
    When I request unmapped components for a non-existent system
    Then I should receive a 404 error

  Scenario: Handle URL-encoded system names
    Given the API server is running
    And there is at least one system in the database
    When I request unmapped components with URL-encoded system name
    Then I should receive a successful response
    And the system name should be correctly decoded

  Scenario: Unmapped components for system have required fields
    Given the API server is running
    And there is a system with unmapped components
    When I request unmapped components for that system
    Then each component should have core identification fields
    And each component should have SBOM fields
