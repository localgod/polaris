Feature: [contract] Token Revocation API
  As a superuser
  I want to revoke API tokens
  So that I can manage user access

  Background:
    Given the API server is running

  Scenario: Superuser revokes a token they own
    Given I am a superuser
    When I request DELETE "/api/admin/users/user-1/tokens/tok-1"
    Then the response should be successful
    And the token should be revoked with the correct userId

  Scenario: Token not belonging to userId returns 404
    Given I am a superuser
    When I request DELETE with a tokenId that belongs to a different user
    Then the request should be rejected with status 404

  Scenario: Unauthenticated request is rejected
    Given I am not authenticated
    When I request DELETE "/api/admin/users/user-1/tokens/tok-1"
    Then the request should be rejected with status 401

  Scenario: Non-superuser is rejected
    Given I am authenticated but not a superuser
    When I request DELETE "/api/admin/users/user-1/tokens/tok-1"
    Then the request should be rejected with status 403

  Scenario: Missing tokenId returns 400
    Given I am a superuser
    When I request DELETE with a missing tokenId
    Then the request should be rejected with status 400

  Scenario: Missing userId returns 400
    Given I am a superuser
    When I request DELETE with a missing userId
    Then the request should be rejected with status 400
