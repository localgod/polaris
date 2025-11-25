---
title: TIME Framework
description: Strategic technology portfolio management with Gartner's TIME framework
---

## Overview

Polaris uses Gartner's TIME framework to categorize technologies based on their strategic value and lifecycle stage. TIME provides a standardized vocabulary for technology portfolio management, enabling organizations to make informed decisions about technology investments, migrations, and decommissioning.

## TIME Categories

### 🟢 Invest

Strategic technologies receiving active investment and development. New projects should use these technologies, and existing projects should migrate to them when feasible.

### 🔵 Migrate

Technologies being phased out with defined migration paths. No new projects should use these technologies. Existing usage requires migration planning with specified target technologies and EOL dates.

### 🟡 Tolerate

Legacy technologies maintained with minimal investment. No new projects should use these technologies. Existing systems continue running with bug fixes and security patches only.

### 🔴 Eliminate

Technologies not approved for any use. Active removal from systems is required. Usage is flagged as a compliance violation.

## Application in Polaris

### Team-Based Approvals

Each team independently assigns TIME categories to technologies based on their needs and strategy. Different teams can have different TIME categories for the same technology, enabling team autonomy while maintaining organizational governance.

Each approval includes:
- TIME category (invest, migrate, tolerate, eliminate)
- Approval date and approver
- Version constraints (e.g., ">=18.0.0")
- EOL date (for migrate/tolerate)
- Migration target (for migrate)
- Notes documenting reasoning

### Default Behavior

Technologies without team approval default to **Eliminate**, ensuring explicit approval is required for technology usage.

### Compliance Detection

The graph model automatically detects violations by comparing actual technology usage against team approvals:

- Using technology without approval (defaults to Eliminate)
- Using technology marked as Migrate or Tolerate
- Using versions outside approved constraints

### Portfolio Analysis

The graph model enables queries for:

- Technology distribution by TIME category
- Technologies approaching EOL
- Migration targets and affected systems
- Team-specific compliance status
- Portfolio health metrics

## Benefits

**Strategic Clarity**: Clear categorization of technology investments aligned with business goals.

**Migration Planning**: Explicit migration paths with EOL tracking enable proactive planning and resource allocation.

**Risk Management**: Identification of outdated technologies, security risks, and compliance violations.

**Budget Optimization**: Focus investment on strategic technologies while minimizing legacy maintenance costs.

**Governance**: Audit trail of decisions with documented reasoning while respecting team autonomy.

## Learn More

- [Graph Model](../architecture/graph-model.md) - How TIME categories are stored and queried in the graph database
