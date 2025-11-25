---
title: TIME Framework
description: Strategic technology portfolio management with Gartner's TIME framework
---

## Overview

Polaris uses **Gartner's TIME framework** for technology portfolio management. TIME categorizes technologies based on their strategic value and future direction, helping organizations make informed decisions about where to invest, what to migrate away from, what to tolerate temporarily, and what to eliminate.

### Why TIME?

The TIME framework provides:
- **Strategic Clarity** - Clear categorization of technology investments aligned with business goals
- **Portfolio Balance** - Visibility into the health of your technology portfolio
- **Migration Planning** - Structured approach to technology transitions
- **Risk Management** - Identification of technologies that pose risks
- **Resource Optimization** - Better allocation of budget and engineering resources

## TIME Categories

### 🟢 Invest

**Strategic technologies worth continued investment and enhancement**

Technologies in the Invest category represent your organization's strategic choices - the platforms and tools you're actively betting on for the future.

**Characteristics:**
- Core to business operations and strategy
- Modern, well-supported platforms with active communities
- Receiving active development and innovation
- Long-term strategic value
- Full organizational support and training available

**When to use Invest:**
- New projects should use these technologies
- Existing projects should migrate to these when feasible
- Training and skill development is encouraged
- Budget is allocated for enhancement and optimization

**Examples:**
- React (Frontend Platform) - Primary framework for customer-facing applications
- TypeScript (Backend & Frontend Platforms) - Required for all new services
- PostgreSQL (Data Platform) - Standard relational database
- Kubernetes (Infrastructure Platform) - Container orchestration standard

### 🔵 Migrate

**Technologies to move to newer platforms**

Technologies in the Migrate category are being actively phased out with clear migration paths to replacement technologies.

**Characteristics:**
- Deprecated or being replaced
- Clear migration target defined
- Active migration planning and execution
- End-of-life (EOL) date established
- Migration support and resources available

**When to use Migrate:**
- No new projects should use these technologies
- Existing projects should plan migration to the target technology
- Maintenance only - no new features unless critical
- Migration timeline and resources are defined

**Examples:**
- Angular → React (Frontend Platform)
  - EOL: 2025-12-31
  - Migration Target: React
  - Reason: "Better ecosystem support and team expertise"
- Java 11 → Java 17 (Backend Platform)
  - EOL: 2024-09-30
  - Migration Target: Java 17
  - Reason: "Security updates and LTS support"

### 🟡 Tolerate

**Keep running but minimize investment**

Technologies in the Tolerate category are legacy systems that still work but are not strategic. They're kept running with minimal investment while decisions are made about their future.

**Characteristics:**
- Legacy systems that still function
- No immediate replacement planned
- Minimal maintenance mode
- EOL may be approaching but no migration target yet
- Limited or no support for new features

**When to use Tolerate:**
- No new projects should use these technologies
- Existing projects continue running but receive minimal investment
- Bug fixes and security patches only
- Awaiting decommissioning decision or migration planning

**Examples:**
- Legacy batch processing systems awaiting modernization
- Older framework versions in low-priority applications
- Technologies used by systems scheduled for retirement
- Deprecated technologies without clear replacement options yet

### 🔴 Eliminate

**Phase out and decommission**

Technologies in the Eliminate category are not approved for use and should be removed from the organization.

**Characteristics:**
- Not approved for any use
- Security or compliance risks
- No business value
- Scheduled for removal
- No support provided

**When to use Eliminate:**
- Technologies must not be used in any new or existing projects
- Active removal from systems is required
- Violations are flagged as critical
- No exceptions granted

**Examples:**
- Technologies with no team approvals
- Severely outdated versions with known security vulnerabilities
- Technologies that violate compliance requirements
- Restricted technologies (e.g., Flash, jQuery in new projects)
- Technologies that have been fully replaced

## How TIME Works in Polaris

### Team-Based Approvals

Each team independently assigns TIME categories to technologies based on their needs and strategy. This means:

**Different teams can have different TIME categories for the same technology:**
- Frontend Platform might categorize Angular as **Migrate** (moving to React)
- Legacy Systems Team might categorize Angular as **Tolerate** (maintaining existing apps)
- Mobile Team might categorize Angular as **Eliminate** (never used, not planning to use)

**Teams track important information with each approval:**
- **TIME Category** - invest, migrate, tolerate, or eliminate
- **Approval Date** - When the decision was made
- **Approver** - Who made the decision
- **Notes** - Context and reasoning
- **Version Constraints** - Specific version requirements (e.g., ">=18.0.0")
- **EOL Date** - End-of-life date (for migrate/tolerate)
- **Migration Target** - Target technology (for migrate)
- **Deprecation Date** - When technology was deprecated (for migrate/tolerate)

## How TIME Categories Work

### Approval Information

Each team's approvals include a TIME category that indicates their strategic intent:

**Example: TypeScript**
- Frontend Platform: **Invest** (Required for all new frontend projects)
- Backend Platform: **Invest** (Required for all backend services)
- Data Platform: **Tolerate** (Legacy batch jobs only)

This means different teams can have different strategies for the same technology based on their needs.

### Portfolio Analysis

The graph model enables analysis of your technology portfolio by TIME category:

**Example Portfolio Distribution:**
- **Invest** (12 technologies) - React, TypeScript, Next.js, PostgreSQL, etc.
- **Migrate** (3 technologies) - Angular, Webpack, Jest
- **Tolerate** (2 technologies) - jQuery (legacy admin), Bower
- **Eliminate** (0 technologies)

### Compliance Detection

The model supports automatic detection of violations by comparing actual usage against TIME approvals:

**Violation Types:**
- No **Using Unapproved Technology** - Team using technology with no approval (Eliminate by default)
- ⚠️ **Using Deprecated Technology** - Team using technology marked as Migrate or Tolerate
- ⚠️ **Version Mismatch** - Team using version outside approved constraints

## TIME Category Representation

TIME categories are represented with visual indicators for quick recognition:

- **Invest**: 🟢 Strategic technology
- **Migrate**: 🔵 Active migration
- **Tolerate**: 🟡 Legacy maintenance
- **Eliminate**: 🔴 Not approved

### Approval Details

Each team approval includes the TIME category along with supporting information:

**Example: Angular**

**Frontend Platform Approval:**
- TIME: **Migrate** 🔵
- EOL: 2025-12-31
- Migrate to: React
- Notes: "Better ecosystem support and team expertise"

**Legacy Systems Team Approval:**
- TIME: **Tolerate** 🟡
- Notes: "Maintaining existing applications only"

## Common Use Cases

### Finding Technologies to Migrate

The graph model enables queries to identify technologies that need migration:

**What you can find:**
- All technologies marked as "Migrate"
- EOL dates and time remaining
- Migration targets
- Which teams are affected

**Example Results:**

| Technology | Team | EOL Date | Days Left | Migrate To |
| ----------- | ------ | ---------- | ----------- | ------------ |
| Angular | Frontend Platform | 2025-12-31 | 245 | React |
| Java 11 | Backend Platform | 2024-09-30 | 45 | Java 17 |

### Tracking Technologies Approaching EOL

The model supports identifying technologies approaching their end-of-life dates:

**Example: Technologies with EOL within 90 days:**
- **Java 11** - EOL in 45 days (Backend Platform)
- **Node.js 14** - EOL in 67 days (Backend Platform)
- **Angular 14** - EOL in 89 days (Frontend Platform)

### Portfolio Health Analysis

The model enables analysis of technology portfolio distribution:

**Organization-Wide TIME Distribution:**
- **Invest**: 45 technologies (65%)
- **Migrate**: 12 technologies (17%)
- **Tolerate**: 10 technologies (14%)
- **Eliminate**: 3 technologies (4%)

**Team-Specific Distribution:**

**Frontend Platform:**
- **Invest**: 12 technologies (71%)
- **Migrate**: 3 technologies (18%)
- **Tolerate**: 2 technologies (11%)
- **Eliminate**: 0 technologies (0%)

## Benefits of the TIME Framework

### 1. Strategic Alignment

**What it provides:**
- Clear categorization of technology investments
- Alignment with business strategy
- Support for portfolio planning and decision-making

**How it helps:**
- Leadership can see where technology investments are focused
- Teams understand which technologies are strategic priorities
- Budget discussions are grounded in strategic categorization

### 2. Migration Planning

**What it provides:**
- Explicit migration paths from old to new technologies
- EOL tracking with automated alerts
- Resource allocation planning for migrations

**How it helps:**
- Teams know what to migrate to and when
- Migration work can be planned and budgeted
- No surprises when technologies reach end-of-life

### 3. Risk Management

**What it provides:**
- Identification of technologies to eliminate
- Tracking of legacy systems (tolerate)
- Minimization of technical debt

**How it helps:**
- Security risks from outdated technologies are visible
- Compliance violations are automatically detected
- Technical debt is quantified and tracked

### 4. Budget Optimization

**What it provides:**
- Focus investment on strategic technologies (invest)
- Minimize spend on legacy systems (tolerate)
- Plan migration budgets (migrate)

**How it helps:**
- Engineering time is allocated to strategic work
- Legacy maintenance costs are minimized
- Migration costs are predictable and planned

### 5. Compliance & Governance

**What it provides:**
- Clear approval policies per team
- Audit trail of decisions
- Standardized categorization across the organization

**How it helps:**
- Teams know what they're allowed to use
- Decisions are documented with reasoning
- Compliance audits are straightforward

## Best Practices

### 1. Regular Reviews

**Recommendation:** Review TIME categories quarterly

**Why:** Technology landscapes change rapidly. Regular reviews ensure your categorizations remain accurate and aligned with strategy.

**What to review:**
- Are Invest technologies still strategic?
- Are Migrate timelines on track?
- Should any Tolerate technologies move to Migrate?
- Are Eliminate technologies actually removed?

### 2. Migration Strategy

**Recommendation:** Always specify migration targets and realistic EOL dates

**Why:** Clear migration paths prevent confusion and enable planning.

**Best practices:**
- **Migrate category must have:** Migration target, EOL date, and migration notes
- **Set realistic EOL dates:** Consider system complexity and team capacity
- **Document reasoning:** Explain why the migration is happening
- **Track progress:** Update status as migration proceeds

**Example:**
- Technology: Angular
- TIME: Migrate
- Migration Target: React
- EOL: 2025-12-31
- Notes: "Better ecosystem support, team expertise, and performance"

### 3. Portfolio Balance

**Recommendation:** Maintain healthy portfolio distribution

**Target distribution:**
- **Invest**: 60-70% - Strategic technologies
- **Migrate**: 10-20% - Active transitions
- **Tolerate**: 10-20% - Legacy maintenance
- **Eliminate**: <5% - Should be removed quickly

**Why:** This balance ensures you're investing in the future while managing legacy systems responsibly.

**Warning signs:**
- **Too much Invest (>80%):** May indicate lack of focus or too many "strategic" choices
- **Too much Migrate (>30%):** Migration fatigue, may need to prioritize
- **Too much Tolerate (>30%):** Accumulating technical debt
- **Too much Eliminate (>10%):** Compliance issues, technologies not being removed

### 4. Team Alignment

**Recommendation:** Document decisions and reasoning

**Why:** Different teams may have different needs, but decisions should be transparent and justified.

**Best practices:**
- **Document reasoning:** Use the notes field to explain why this TIME category was chosen
- **Specify approver:** Record who made the decision for accountability
- **Respect team autonomy:** Different teams can have different TIME categories for the same technology
- **Share learnings:** Teams can learn from each other's migration experiences

**Example:**
- Frontend Platform: Angular = **Migrate** (moving to React for better ecosystem)
- Legacy Systems Team: Angular = **Tolerate** (maintaining existing apps, no new development)

### 5. Version-Specific Policies

**Recommendation:** Use version constraints for precise control

**Why:** Not all versions of a technology are equal. Version constraints enable granular governance.

**Best practices:**
- **Invest technologies:** Specify approved version ranges (e.g., ">=18.0.0 <19.0.0")
- **Migrate technologies:** May have different constraints for different versions
- **Track version-specific EOL:** Some versions reach EOL before others

**Example:**
- Technology: Node.js
- TIME: Invest
- Version Constraint: ">=18.0.0 <21.0.0"
- Notes: "LTS versions only, upgrade to 20.x by Q2 2025"

## Reporting Capabilities

The TIME framework in the graph model enables various types of analysis and reporting:

### Portfolio Health Metrics

**What the model supports:**
- Breakdown of technologies by TIME category
- Percentage distribution across categories
- Comparison against target ranges

**Target Metrics:**
- **Invest**: 60-70% (Strategic technologies)
- **Migrate**: 10-20% (Active transitions)
- **Tolerate**: 10-20% (Legacy maintenance)
- **Eliminate**: <5% (Should be removed quickly)

### Migration Pipeline Tracking

**What the model supports:**
- Identification of all technologies in Migrate status
- EOL dates and time remaining calculations
- Migration target relationships
- Team assignments

**Example Queries:**
- Technologies with EOL dates within 90 days
- Technologies sorted by urgency
- Migration targets and affected systems

### Risk Identification

**What the model supports:**
- Technologies past EOL still in use
- Eliminate category technologies not removed
- Tolerate technologies without migration plans
- Teams using unapproved technologies

**Compliance Analysis:**
- Systems in compliance vs. violations
- Violations by severity level
- Team-specific compliance status

### Team-Specific Analysis

**What the model supports:**
- Team's technology portfolio by TIME category
- Team's upcoming EOL dates
- Team's compliance status
- Team's usage vs. approvals

## Real-World Example

### Scenario: Frontend Platform Team

**Current Portfolio (Q4 2024):**

**Invest (12 technologies - 71%):**
- React 18.x - Primary framework
- TypeScript 5.x - Required for all projects
- Next.js 14.x - SSR framework
- Tailwind CSS 3.x - Styling
- PostgreSQL 15.x - Database
- And 7 more...

**Migrate (3 technologies - 18%):**
- Angular 14.x → React (EOL: 2025-12-31)
  - 5 systems to migrate
  - Migration plan in progress
- Webpack 5.x → Vite (EOL: 2025-06-30)
  - 8 systems to migrate
  - Migration started
- Jest 28.x → Vitest (EOL: 2025-09-30)
  - 12 systems to migrate
  - Planning phase

**Tolerate (2 technologies - 11%):**
- jQuery 3.x - Legacy admin panel only
  - 1 system, scheduled for retirement
- Bower - Legacy dependency management
  - 1 system, scheduled for retirement

**Eliminate (0 technologies - 0%):**
- No violations

**Health Assessment:** Yes Healthy portfolio
- Good balance of strategic investments
- Clear migration plans with realistic timelines
- Minimal legacy debt
- No compliance violations

## Summary

The TIME framework in Polaris provides:

1. **Strategic Clarity** - Clear categorization of technology investments aligned with business goals
2. **Team Autonomy** - Teams can make decisions appropriate for their context while maintaining governance
3. **Governance** - Organization-wide visibility through the graph model's relationship structure
4. **Planning** - Structured approach to migrations with explicit targets and timelines
5. **Risk Management** - Identification and tracking of technical debt and security risks through compliance detection

By using TIME categories consistently, organizations can maintain a healthy technology portfolio while giving teams the flexibility they need to deliver value.

The graph model's support for TIME categories enables:
- Automatic compliance detection by comparing usage against approvals
- Portfolio health analysis across teams and the organization
- Migration planning with EOL tracking
- Risk identification for technologies past EOL or marked for elimination

## Learn More

- [Graph Model](../architecture/graph-model.md) - Understanding how TIME categories are stored and related in the graph database
