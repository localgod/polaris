---
title: Polaris Documentation
description: Enterprise Technology Catalog with Neo4j and Nuxt 4
---

Welcome to the Polaris documentation. Polaris is an enterprise technology catalog built with Nuxt 4 and Neo4j graph database.

## What is Polaris?

Polaris helps organizations manage their technology landscape by:

- **Technology Catalog**: Track approved technologies and their versions
- **Team-Specific Approvals**: Different approval policies per team using Gartner's TIME framework
- **System Inventory**: Map systems and their technology dependencies
- **Team Ownership**: Link technologies and systems to responsible teams
- **Policy Compliance**: Define and track governance policies
- **Dependency Visualization**: Understand relationships through graph queries

## Quick Links

### Core Concepts

- [Technologies vs Components](/docs/concepts) - Understanding the key distinction

### Features

- [TIME Framework](/docs/features/time-framework)
- [Team Approvals](/docs/features/team-approvals)

### Architecture

- [Graph Model](/docs/architecture/graph-model)
- [API Endpoints](/docs/api/endpoints)

## TIME Framework

Polaris uses **Gartner's TIME framework** for technology portfolio management:

- 🟢 **Invest**: Strategic technologies worth continued investment
- 🔵 **Migrate**: Technologies to move to newer platforms
- 🟡 **Tolerate**: Keep running but minimize investment
- 🔴 **Eliminate**: Phase out and decommission

## Key Features

### Team-Specific Approvals

Each team can have different approval policies for the same technology:

- **Per-Team Policies**: Different TIME categories per team
- **Version-Specific Approvals**: Approve or restrict specific versions
- **Approval Hierarchy**: Version-specific > Technology-level > Default (eliminate)
- **Rich Metadata**: EOL dates, migration targets, version constraints

### Graph Database

Neo4j graph database enables powerful queries:

- Find all systems using a technology
- Track technology dependencies
- Identify technologies approaching EOL
- Analyze portfolio distribution by TIME category

## Technology Stack

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- **Database**: Neo4j 5 Community Edition
- **Testing**: Vitest with Gherkin-style BDD
- **Development**: Dev Containers, Gitpod support

## Getting Help

- [GitHub Repository](https://github.com/localgod/polaris)
- [Issue Tracker](https://github.com/localgod/polaris/issues)
- [Contributing Guide](https://github.com/localgod/polaris/blob/main/CONTRIBUTING.md)
