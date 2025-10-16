# Using nuxt-neo4j Module

This project uses the `nuxt-neo4j` module for seamless Neo4j integration with Nuxt.

## Related Documentation

- [Pages & Routing](PAGES.md) - See examples of Neo4j usage in pages
- [Tech Catalog Schema](TECH_CATALOG_SCHEMA.md) - Data model for queries
- [Database Migrations](DATABASE_MIGRATIONS.md) - Schema management

## Overview

The `nuxt-neo4j` module provides:
- **Automatic driver management** - No need to manually create/close drivers
- **Configuration via nuxt.config.ts** - Centralized database configuration
- **DevTools integration** - Access Neo4j workspace from Nuxt DevTools
- **TypeScript support** - Full type safety with official neo4j-driver
- **Simple API** - Use `useDriver()` composable in server routes

## Configuration

The module is already configured in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [
    'nuxt-neo4j'
  ],
  
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://172.19.0.2:7687',
    auth: {
      type: 'basic',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'devpassword'
    }
  }
})
```

## Usage in API Routes

### Basic Query

```typescript
// server/api/example.get.ts
export default defineEventHandler(async () => {
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(`
    MATCH (n:Node)
    RETURN n
    LIMIT 10
  `)
  
  return records.map(record => record.get('n'))
})
```

### Query with Parameters

```typescript
// server/api/technology/[name].get.ts
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(
    `
    MATCH (t:Technology {name: $name})
    OPTIONAL MATCH (t)-[:HAS_VERSION]->(v:Version)
    RETURN t, collect(v) as versions
    `,
    { name }
  )
  
  if (records.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Technology not found'
    })
  }
  
  return {
    technology: records[0].get('t'),
    versions: records[0].get('versions')
  }
})
```

### Complex Query with Relationships

```typescript
// server/api/systems/[name]/dependencies.get.ts
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(
    `
    MATCH (s:System {name: $name})-[:USES]->(c:Component)-[:IS_VERSION_OF]->(t:Technology)
    RETURN s.name as system,
           c.name as component,
           c.version as version,
           t.name as technology,
           t.status as status
    ORDER BY t.name
    `,
    { name }
  )
  
  return records.map(record => ({
    system: record.get('system'),
    component: record.get('component'),
    version: record.get('version'),
    technology: record.get('technology'),
    status: record.get('status')
  }))
})
```

### Write Operations

```typescript
// server/api/technology.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const driver = useDriver()
  
  const { records } = await driver.executeQuery(
    `
    CREATE (t:Technology {
      name: $name,
      category: $category,
      vendor: $vendor,
      status: $status,
      riskLevel: $riskLevel,
      lastReviewed: date()
    })
    RETURN t
    `,
    {
      name: body.name,
      category: body.category,
      vendor: body.vendor,
      status: body.status,
      riskLevel: body.riskLevel
    }
  )
  
  return {
    success: true,
    technology: records[0].get('t')
  }
})
```

### Error Handling

```typescript
// server/api/safe-query.get.ts
export default defineEventHandler(async () => {
  try {
    const driver = useDriver()
    
    const { records } = await driver.executeQuery(`
      MATCH (t:Technology)
      RETURN t
    `)
    
    return {
      success: true,
      data: records.map(r => r.get('t'))
    }
  } catch (error) {
    console.error('Database error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }
  }
})
```

## Best Practices

### 1. Use executeQuery() for Simple Queries

The `executeQuery()` method is the recommended way to run queries:

```typescript
const { records } = await driver.executeQuery(query, parameters)
```

Benefits:
- Automatic session management
- Automatic transaction handling
- Cleaner code

### 2. Use Sessions for Complex Transactions

For complex multi-query transactions, use sessions:

```typescript
const driver = useDriver()
const session = driver.session()

try {
  const tx = session.beginTransaction()
  
  try {
    await tx.run('CREATE (n:Node {name: $name})', { name: 'test' })
    await tx.run('CREATE (m:Node {name: $name})', { name: 'test2' })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
} finally {
  await session.close()
}
```

### 3. Always Use Parameters

Never concatenate user input into queries:

```typescript
// ❌ BAD - SQL injection risk
const query = `MATCH (t:Technology {name: "${userInput}"}) RETURN t`

// ✅ GOOD - Safe parameterized query
const { records } = await driver.executeQuery(
  'MATCH (t:Technology {name: $name}) RETURN t',
  { name: userInput }
)
```

### 4. Handle Errors Gracefully

Always wrap database calls in try-catch:

```typescript
try {
  const { records } = await driver.executeQuery(query)
  return { success: true, data: records }
} catch (error) {
  console.error('Database error:', error)
  return { success: false, error: error.message }
}
```

### 5. Return Consistent Response Formats

Use consistent response structures:

```typescript
// Success response
return {
  success: true,
  data: [...],
  count: 10
}

// Error response
return {
  success: false,
  error: 'Error message',
  data: []
}
```

## Common Patterns

### List All Nodes

```typescript
const { records } = await driver.executeQuery(`
  MATCH (n:NodeType)
  RETURN n
  ORDER BY n.name
`)
```

### Get Node with Relationships

```typescript
const { records } = await driver.executeQuery(`
  MATCH (n:NodeType {id: $id})
  OPTIONAL MATCH (n)-[r]->(related)
  RETURN n, collect({type: type(r), node: related}) as relationships
`, { id })
```

### Count Nodes

```typescript
const { records } = await driver.executeQuery(`
  MATCH (n:NodeType)
  RETURN count(n) as count
`)
const count = records[0].get('count').toNumber()
```

### Aggregate Data

```typescript
const { records } = await driver.executeQuery(`
  MATCH (t:Technology)
  RETURN t.category as category,
         count(t) as count
  ORDER BY count DESC
`)
```

## Type Safety

Define TypeScript interfaces for your data:

```typescript
interface Technology {
  name: string
  category: string
  vendor: string
  status: string
  riskLevel: string
}

export default defineEventHandler(async (): Promise<Technology[]> => {
  const driver = useDriver()
  const { records } = await driver.executeQuery(`
    MATCH (t:Technology)
    RETURN t.name as name,
           t.category as category,
           t.vendor as vendor,
           t.status as status,
           t.riskLevel as riskLevel
  `)
  
  return records.map(record => ({
    name: record.get('name'),
    category: record.get('category'),
    vendor: record.get('vendor'),
    status: record.get('status'),
    riskLevel: record.get('riskLevel')
  }))
})
```

## DevTools Integration

The module provides Neo4j workspace access in Nuxt DevTools:

1. Start the dev server: `npm run dev`
2. Open Nuxt DevTools (bottom of the page)
3. Navigate to the Neo4j tab
4. Access Neo4j Browser directly from DevTools

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Check Neo4j is running:
   ```bash
   docker compose -f .devcontainer/docker-compose.yml ps neo4j
   ```

2. Verify connection settings in `.env`:
   ```
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=devpassword
   ```

3. Test connection:
   ```bash
   curl http://localhost:3000/api/db-status
   ```

### Query Errors

If queries fail:

1. Test the query in Neo4j Browser first
2. Check parameter names match
3. Verify node labels and property names
4. Check for syntax errors

### Type Errors

If you get TypeScript errors:

1. Ensure `neo4j-driver` types are installed
2. Define proper interfaces for your data
3. Use type assertions when needed:
   ```typescript
   const value = record.get('field') as string
   ```

## Migration from Manual Driver

If you have existing code using manual driver creation:

### Before (Manual)

```typescript
import neo4j from 'neo4j-driver'

export default defineEventHandler(async () => {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass))
  const session = driver.session()
  
  try {
    const result = await session.run(query)
    return result.records
  } finally {
    await session.close()
    await driver.close()
  }
})
```

### After (nuxt-neo4j)

```typescript
export default defineEventHandler(async () => {
  const driver = useDriver()
  const { records } = await driver.executeQuery(query)
  return records
})
```

Benefits:
- ✅ Less boilerplate
- ✅ Automatic resource management
- ✅ Centralized configuration
- ✅ Better error handling
- ✅ DevTools integration

## Resources

- [nuxt-neo4j GitHub](https://github.com/arashsheyda/nuxt-neo4j)
- [Neo4j Driver Documentation](https://neo4j.com/docs/javascript-manual/current/)
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
