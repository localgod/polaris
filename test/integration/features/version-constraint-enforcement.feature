Feature: Version Constraint Enforcement
  As a system administrator
  I want to manage version constraints and their enforcement
  So that I can ensure compliance across the organization

  Scenario: Create version constraint with all enhanced properties
    Given test data has been created
    When I query for a version constraint with all properties
    Then the version constraint should exist
    And all properties should be set correctly

  Scenario: Handle expired version constraints
    Given test data has been created
    When I query for an expired version constraint
    Then the version constraint should be archived with an expiry date

  Scenario: Create ENFORCES relationship between team and version constraint
    Given test data has been created
    When I create an ENFORCES relationship between team and version constraint
    Then the ENFORCES relationship should exist

  Scenario: Find all constraints enforced by a team
    Given test data has been created
    When I create enforcement relationships for multiple constraints
    Then I should find all constraints enforced by the team

  Scenario: Create SUBJECT_TO relationship between team and version constraint
    Given test data has been created
    When I create a SUBJECT_TO relationship between team and version constraint
    Then the SUBJECT_TO relationship should exist

  Scenario: Apply organization-wide constraints to all teams
    Given test data has been created
    When I apply an organization-wide version constraint to all teams
    Then all teams should be subject to the version constraint

  Scenario: Apply domain-specific constraints only to teams in that domain
    Given test data has been created
    When I apply a domain-specific version constraint to frontend teams
    Then only frontend teams should be subject to the version constraint

  Scenario: Create GOVERNS relationship between version constraint and technology
    Given test data has been created
    When I create a GOVERNS relationship between version constraint and technology
    Then the GOVERNS relationship should exist

  Scenario: Find all technologies governed by a version constraint
    Given test data has been created
    When I create GOVERNS relationships for multiple technologies
    Then I should find all technologies governed by the version constraint

  Scenario: Find constraints governing high-risk technologies
    Given test data has been created
    When I create a GOVERNS relationship for a high-risk technology
    Then I should find constraints governing high-risk technologies

  Scenario: Find active constraints
    Given test data has been created
    When I query for active constraints
    Then I should find at least two active constraints

  Scenario: Find constraints by scope
    Given test data has been created
    When I query for organization-scoped constraints
    Then I should find the organization version constraint

  Scenario: Find constraints enforced by a specific team
    Given test data has been created
    When I create enforcement relationships and query for them
    Then I should find constraints enforced by the team

  Scenario: Find all compliance requirements for a team
    Given test data has been created
    When I create SUBJECT_TO relationships for a team
    Then I should find all compliance requirements for the team
