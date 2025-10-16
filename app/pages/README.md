# Pages

This directory contains the application pages using Nuxt's file-based routing.

## Available Pages

### Home Page (`/`)
**File:** `index.vue`

The landing page with:
- Database status indicator
- Quick links to documentation and resources
- Link to Technologies Catalog
- Development tools information

### Technologies Catalog (`/technologies`)
**File:** `technologies.vue`

Displays all technologies from the Neo4j database with:
- **Summary statistics**: Total count and status breakdown
- **Category filtering**: Filter technologies by category
- **Technology cards** showing:
  - Name and vendor
  - Status (approved/deprecated/experimental)
  - Category and risk level
  - Owner team
  - Approved version range
  - Available versions
  - Last review date

**Features:**
- Real-time data from Neo4j
- Loading and error states
- Empty state with seeding instructions
- Responsive grid layout
- Color-coded status and risk indicators

## API Endpoints

All API endpoints use the `nuxt-neo4j` module's `useDriver()` composable for database access.

### GET `/api/technologies`

Returns all technologies with their details.

**Implementation:**
```typescript
export default defineEventHandler(async () => {
  const driver = useDriver() // Uses nuxt-neo4j module
  const { records } = await driver.executeQuery(`
    MATCH (t:Technology)
    RETURN t
  `)
  // Process records...
})
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "React",
      "category": "framework",
      "vendor": "Meta",
      "status": "approved",
      "approvedVersionRange": ">=18.0.0 <19.0.0",
      "ownerTeam": "Frontend Platform",
      "riskLevel": "low",
      "lastReviewed": "2025-10-01",
      "ownerTeamName": "Frontend Platform",
      "versions": ["18.2.0", "18.3.1"]
    }
  ],
  "count": 10
}
```

### GET `/api/db-status`

Returns database connection status.

**Implementation:**
```typescript
export default defineEventHandler(async () => {
  const driver = useDriver() // Uses nuxt-neo4j module
  await driver.verifyConnectivity()
  const { records } = await driver.executeQuery('RETURN 1 as status')
  // Return status...
})
```

**Response:**
```json
{
  "status": "online",
  "message": "Database connection successful"
}
```

## Adding New Pages

Nuxt uses file-based routing. To add a new page:

1. Create a `.vue` file in `app/pages/`
2. The filename becomes the route (e.g., `about.vue` → `/about`)
3. Use folders for nested routes (e.g., `users/[id].vue` → `/users/:id`)

Example:

```vue
<!-- app/pages/systems.vue -->
<template>
  <div>
    <h1>Systems</h1>
    <!-- Your content -->
  </div>
</template>

<script setup lang="ts">
// Your logic
</script>
```

## Data Fetching

Use Nuxt's composables for data fetching:

```typescript
// Fetch data from API
const { data, pending, error } = await useFetch('/api/endpoint')

// Access data in template
<div v-if="pending">Loading...</div>
<div v-else-if="error">Error: {{ error.message }}</div>
<div v-else>{{ data }}</div>
```

## Navigation

Use `NuxtLink` for internal navigation:

```vue
<NuxtLink to="/technologies">View Technologies</NuxtLink>
```

Use regular `<a>` tags for external links:

```vue
<a href="https://example.com" target="_blank">External Link</a>
```

## Page Metadata

Set page title and meta tags:

```typescript
useHead({
  title: 'Page Title - Polaris',
  meta: [
    { name: 'description', content: 'Page description' }
  ]
})
```

## Styling

The project uses Tailwind CSS for styling. Common patterns:

- **Layout**: `container mx-auto px-4 py-8`
- **Cards**: `bg-white rounded-lg shadow p-6`
- **Buttons**: `px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`
- **Status badges**: `px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold`

## Best Practices

1. **Use TypeScript**: Define interfaces for your data
2. **Handle loading states**: Show loading indicators
3. **Handle errors**: Display user-friendly error messages
4. **Handle empty states**: Guide users when no data exists
5. **Use semantic HTML**: Proper heading hierarchy, accessible markup
6. **Responsive design**: Use Tailwind's responsive utilities
7. **SEO**: Set appropriate page titles and meta tags

## Next Steps

Consider adding pages for:
- `/systems` - List all systems
- `/teams` - List all teams
- `/policies` - List all policies
- `/components` - List all components (SBOM)
- `/technologies/[name]` - Technology detail page
- `/systems/[name]` - System detail page with dependencies

## Related Documentation

- [Nuxt Pages](https://nuxt.com/docs/guide/directory-structure/pages)
- [Nuxt Routing](https://nuxt.com/docs/getting-started/routing)
- [Data Fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [SEO and Meta](https://nuxt.com/docs/getting-started/seo-meta)
