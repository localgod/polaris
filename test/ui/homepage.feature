Feature: Homepage UI
  As a user
  I want to visit the homepage
  So that I can see the application is working

  Scenario: Homepage loads successfully
    Given the application server is running
    When I navigate to the homepage
    Then the page should load successfully
    And the page should contain the application title
