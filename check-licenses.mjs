import neo4j from 'neo4j-driver'
import { readFileSync, existsSync } from 'fs'

const envPath = '.env'
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
}

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'neo4j://neo4j:7687',
  neo4j.auth.basic(process.env.NEO4J_USERNAME || 'neo4j', process.env.NEO4J_PASSWORD || 'devpassword')
)

const session = driver.session()
try {
  const licResult = await session.run('MATCH (c:Component)-[:HAS_LICENSE]->(l:License) RETURN c.name, c.version, l.id, l.name LIMIT 10')
  console.log('Components with License relationships:')
  licResult.records.forEach(r => {
    console.log(JSON.stringify({ comp: r.get('c.name'), ver: r.get('c.version'), licId: r.get('l.id'), licName: r.get('l.name') }))
  })
  
  const licCount = await session.run('MATCH ()-[r:HAS_LICENSE]->() RETURN count(r) as count')
  console.log('\nTotal HAS_LICENSE relationships:', licCount.records[0].get('count').toNumber())
  
  const result = await session.run('MATCH (c:Component) WHERE c.licenses IS NOT NULL AND size(c.licenses) > 0 RETURN c.name, c.version, c.licenses LIMIT 5')
  console.log('\nComponents with licenses property:')
  result.records.forEach(r => {
    console.log(JSON.stringify({ name: r.get('c.name'), version: r.get('c.version'), licenses: r.get('c.licenses') }, null, 2))
  })
  
  const count = await session.run('MATCH (c:Component) WHERE c.licenses IS NOT NULL AND size(c.licenses) > 0 RETURN count(c) as count')
  console.log('\nTotal components with licenses property:', count.records[0].get('count').toNumber())
  
  const noLicenseCount = await session.run('MATCH (c:Component) WHERE c.licenses IS NULL OR size(c.licenses) = 0 RETURN count(c) as count')
  console.log('Total components without licenses property:', noLicenseCount.records[0].get('count').toNumber())
} finally {
  await session.close()
  await driver.close()
}
