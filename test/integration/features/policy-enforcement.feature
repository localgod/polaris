Feature: Policy Enforcement
  As a system administrator
  I want to manage policies and their enforcement
  So that I can ensure compliance across the organization

  Scenario: Create policy with all enhanced properties
    Given test data has been created
    When I query for a policy with all properties
    Then the policy should exist
    And all properties should be set correctly

  Scenario: Handle expired policies
    Given test data has been created
    When I query for an expired policy
    Then the policy should be archived with an expiry date

  Scenario: Create ENFORCES relationship
    Given test data has been created
    When I create an ENFORCES relationship between team and policy
    Then the ENFORCES relationship should exist

  Scenario: Find all policies enforced by a team
    Given test data has been created
    When I create enforcement relationships for multiple policies
    Then I should find all policies enforced by the team

  Scenario: Create SUBJECT_TO relationship
    Given test data has been created
    When I create a SUBJECT_TO relationship between team and policy
    Then the SUBJECT_TO relationship should exist

  Scenario: Apply organization-wide policies to all teams
    Given test data has been created
    When I apply an organization-wide policy to all teams
    Then all teams should be subject to the policy

  Scenario: Apply domain-specific policies only to teams in that domain
    Given test data has been created
    When I apply a domain-specific policy to frontend teams
    Then only frontend teams should be subject to the policy

  Scenario: Create GOVERNS relationship to technology
    Given test data has been created
    When I create a GOVERNS relationship between policy and technology
    Then the GOVERNS relationship should exist

  Scenario: Find all technologies governed by a policy
    Given test data has been created
    When I create GOVERNS relationships for multiple technologies
    Then I should find all technologies governed by the policy

  Scenario: Find policies governing high-risk technologies
    Given test data has been created
    When I create a GOVERNS relationship for a high-risk technology
    Then I should find policies governing high-risk technologies

  Scenario: Find active policies
    Given test data has been created
    When I query for active policies
    Then I should find at least two active policies

  Scenario: Find policies by scope
    Given test data has been created
    When I query for organization-scoped policies
    Then I should find the organization policy

  Scenario: Find policies enforced by a specific team
    Given test data has been created
    When I create enforcement relationships and query for them
    Then I should find policies enforced by the team

  Scenario: Find all compliance requirements for a team
    Given test data has been created
    When I create SUBJECT_TO relationships for a team
    Then I should find all compliance requirements for the team
