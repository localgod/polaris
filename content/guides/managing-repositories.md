---
title: Managing System Repositories
description: How to add and manage source code repositories for your systems
---

## Overview

Associate source code repositories with your systems to track where code is stored and enable better governance and compliance.

## Creating a System with Repositories

### Basic Information

When creating a system, provide:

- **System Name** - Lowercase letters, numbers, and hyphens (e.g., `customer-portal`)
- **Domain** - Business domain (e.g., `customer-experience`)
- **Owner Team** - Select from existing teams
- **Business Criticality** - Critical, High, Medium, or Low
- **Environment** - Development, Test, Staging, or Production

### Adding Repositories

**Quick Method (Recommended):**

1. Click "Add Repository"
2. Paste the repository URL (e.g., `https://github.com/company/repo`)
3. Press Tab or click outside the field
4. Details auto-fill automatically:
   - SCM type detected from URL
   - Repository name extracted
   - Public/private status inferred
   - Authentication requirement set

**Manual Override:**

If auto-fill values need adjustment:

1. Click "Show advanced options"
2. Manually adjust:
   - SCM Type (Git, SVN, Mercurial, Perforce)
   - Repository Name
   - Public repository checkbox
   - Requires authentication checkbox

### Multiple Repositories

For systems with multiple repositories (frontend, backend, etc.):

1. Click "Add Repository" for each additional repository
2. Paste the URL and let it auto-fill
3. Remove any repository by clicking the X button

## Auto-Fill Features

### SCM Type Detection

| URL Pattern | Detected Type |
| ------------- | --------------- |
| `github.com`, `gitlab.com`, `bitbucket.org` | Git |
| `svn.` or `/svn/` | SVN |
| `hg.` or `/hg/` | Mercurial |
| Other | Git (default) |

### Repository Name Extraction

- `https://github.com/company/customer-portal` → `customer-portal`
- `https://github.com/company/repo.git` → `repo`

### Public/Private Detection

- GitHub/GitLab/Bitbucket public repos → Public
- All others → Private (requires authentication)

## Examples

### Single Repository System

**System:** Customer Portal  
**Repository:** `https://github.com/company/customer-portal`

1. Enter system name: `customer-portal`
2. Select domain, team, criticality, environment
3. Click "Add Repository"
4. Paste: `https://github.com/company/customer-portal`
5. Verify auto-filled values
6. Click "Save System"

### Microservice with Multiple Repositories

**System:** Order Service  
**Repositories:**
- `https://github.com/company/order-ui`
- `https://github.com/company/order-api`
- `https://github.com/company/order-db-migrations`

1. Enter system details
2. Add each repository URL
3. Click "Save System"

### Legacy System with SVN

**System:** Legacy Billing  
**Repository:** `https://svn.company.com/legacy/billing`

Auto-detects SVN type and sets authentication required.

## Best Practices

### Consistent Naming

Keep system names aligned with repository names:
- System: `customer-portal`
- Repository: `https://github.com/company/customer-portal`

### Include All Related Repositories

Add all repositories that comprise the system:
- Frontend code
- Backend APIs
- Database migrations
- Infrastructure as code
- Documentation

### Use Full URLs

Always use complete HTTPS URLs:
- Yes `https://github.com/company/repo`
- No `github.com/company/repo`
- No `git@github.com:company/repo.git`

Note: SSH URLs are automatically converted to HTTPS.

### Verify Auto-Fill

After pasting a URL, verify auto-filled values. Use "Show advanced options" for adjustments.

## Automatic Properties

The system automatically determines source code properties:

- **Has Source Access** - Set to `true` when repositories are added
- **Source Code Type**:
  - `open-source` if any repository is public
  - `proprietary` if all repositories are private
  - `unknown` if no repositories

## URL Normalization

Repository URLs are automatically normalized:

- Trailing slashes removed
- `.git` suffix removed
- SSH converted to HTTPS
- Lowercased for consistency

This prevents duplicate entries with different URL formats.

## Troubleshooting

### Repository Not Auto-Filling

Click outside the URL field or press Tab to trigger auto-fill.

### Wrong SCM Type Detected

Click "Show advanced options" and manually select the correct type.

### Duplicate Repository Error

The repository is already associated with another system. Repositories can be shared across systems.

## FAQ

**Q: Can multiple systems share the same repository?**  
A: Yes, repositories can be associated with multiple systems.

**Q: What if my repository requires special authentication?**  
A: Check the "Requires authentication" box. Credentials are managed separately and never stored in Polaris.

**Q: Can I add repositories after creating a system?**  
A: Not yet, but this feature is coming soon. Include all repositories during system creation.

**Q: What if my repository is on an internal server?**  
A: Use the full URL to your internal server. Auto-fill works with any URL pattern.

**Q: Do I need to add every branch as a separate repository?**  
A: No, just add the repository URL once. All branches are part of the same repository.

**Q: What happens if I enter an invalid URL?**  
A: The form shows a validation error. Use a complete URL starting with `http://` or `https://`.

## See Also

- [Core Concepts](/docs/concepts)
- [Graph Model](/docs/architecture/graph-model)
