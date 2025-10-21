# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release with Nuxt 4 and Neo4j integration
- Enterprise technology catalog data model
  - Technology nodes with version tracking
  - System/Application inventory
  - Team ownership mapping
  - Policy compliance tracking
- Database migration system with CLI tools
  - Create, apply, and rollback migrations
  - Migration validation and status tracking
  - Standalone migration runner
- Gherkin-style BDD testing with Vitest
  - Test organization by domain (api, schema, app)
  - Feature files for test documentation
  - Comprehensive test coverage reporting
- Development environment setup
  - Dev Container configuration with Neo4j
  - Gitpod automations for cloud development
  - Automated environment setup scripts
- CI/CD pipeline with GitHub Actions
  - Automated linting (ESLint, markdownlint)
  - Test execution with Neo4j service
  - Build verification
  - Coverage reporting in PRs
- Comprehensive documentation
  - User-focused README
  - Detailed contributing guide
  - Code of conduct
  - Agent instructions for AI assistants

### Changed

### Deprecated

### Removed

### Fixed

### Security
