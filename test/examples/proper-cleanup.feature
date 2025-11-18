Feature: Example: Proper Database Cleanup
  As a test writer
  I want to see examples of proper cleanup patterns
  So that I can write tests that don't leak data

  Scenario: Create and verify test data with cleanup
    Given the database is clean
    When I create a test node
    Then the node should exist in the database
    And cleanup should remove the test data

  Scenario: Using helper function for cleanup
    Given I have test data
    When I run cleanup
    Then the database should be clean
