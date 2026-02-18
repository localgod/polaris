#!/usr/bin/env node

/**
 * Dump Neo4j Graph Schema
 *
 * Calls apoc.meta.schema() and writes the result as formatted JSON.
 *
 * Usage:
 *   npm run schema:dump                     # writes to .data/schema.json
 *   npm run schema:dump -- --out=my.json    # custom output path
 *   npm run schema:dump -- --stdout         # print to stdout
 */

import neo4j from 'neo4j-driver'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Load .env
const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
}

const DEFAULT_OUT = join(process.cwd(), '.data', 'schema.json')

async function dumpSchema() {
  const args = process.argv.slice(2)
  const toStdout = args.includes('--stdout')
  const outArg = args.find(a => a.startsWith('--out='))
  const outPath = outArg ? outArg.split('=')[1] : DEFAULT_OUT

  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const username = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'devpassword'

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
  const session = driver.session()

  try {
    const result = await session.run('CALL apoc.meta.schema() YIELD value RETURN value')

    if (result.records.length === 0) {
      console.error('No schema data returned')
      process.exit(1)
    }

    const raw = result.records[0].get('value')

    // Convert neo4j Integer objects ({low, high}) to plain numbers
    function simplify(obj: unknown): unknown {
      if (obj === null || obj === undefined) return obj
      if (neo4j.isInt(obj)) return (obj as neo4j.Integer).toNumber()
      if (Array.isArray(obj)) return obj.map(simplify)
      if (typeof obj === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          out[k] = simplify(v)
        }
        return out
      }
      return obj
    }

    const schema = simplify(raw)
    const json = JSON.stringify(schema, null, 2)

    if (toStdout) {
      process.stdout.write(json + '\n')
    } else {
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, json + '\n')
      console.log(`Schema written to ${outPath}`)
    }
  } finally {
    await session.close()
    await driver.close()
  }
}

dumpSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
