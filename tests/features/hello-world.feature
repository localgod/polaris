Feature: Hello World API Test
  As a developer
  I want to test basic functionality
  So that I can verify the testing framework works correctly

  Scenario: Simple greeting generation
    Given I have a name "World"
    When I create a greeting
    Then the result should be "Hello, World!"
    And the greeting should contain the name

  Scenario: Custom greeting
    Given I have a custom name "Vitest"
    When I create a greeting with "Welcome"
    Then the result should be "Welcome, Vitest!"
