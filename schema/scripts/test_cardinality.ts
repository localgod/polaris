import neo4j from 'neo4j-driver';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env file manually
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const username = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'devpassword';

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function runQueries() {
  const session = driver.session();
  
  try {
    console.log('\n=== QUERY 1: Repository to System Cardinality ===\n');
    
    const result1 = await session.run(`
      MATCH (r:Repository)
      OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
      RETURN r.url as repository,
             r.name as repoName,
             count(s) as systemCount,
             collect(s.name) as systems
      ORDER BY systemCount DESC, r.name
    `);
    
    console.log('Repository URL | Repo Name | System Count | Systems');
    console.log('-'.repeat(100));
    result1.records.forEach(record => {
      const repo = record.get('repository');
      const repoName = record.get('repoName');
      const count = record.get('systemCount').toNumber();
      const systems = record.get('systems');
      console.log(`${repo} | ${repoName} | ${count} | ${systems.join(', ')}`);
    });
    
    console.log('\n=== QUERY 2: Systems with Multiple Repositories ===\n');
    
    const result2 = await session.run(`
      MATCH (s:System)-[:HAS_SOURCE_IN]->(r:Repository)
      WITH s, count(r) as repoCount, collect(r.url) as repos
      WHERE repoCount > 1
      RETURN s.name as system,
             repoCount,
             repos
      ORDER BY repoCount DESC
    `);
    
    console.log('System | Repository Count | Repositories');
    console.log('-'.repeat(100));
    result2.records.forEach(record => {
      const system = record.get('system');
      const count = record.get('repoCount').toNumber();
      const repos = record.get('repos');
      console.log(`${system} | ${count} | ${repos.join(', ')}`);
    });
    
    console.log('\n=== QUERY 3: Find Systems by Repository URL ===\n');
    
    const testRepoUrl = 'https://github.com/company/customer-portal';
    const result3 = await session.run(`
      MATCH (r:Repository {url: $url})
      OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
      RETURN r.url as repository,
             collect(s.name) as systems,
             count(s) as systemCount
    `, { url: testRepoUrl });
    
    console.log(`Repository: ${testRepoUrl}`);
    if (result3.records.length > 0) {
      const systems = result3.records[0].get('systems');
      const count = result3.records[0].get('systemCount').toNumber();
      console.log(`Systems using this repository: ${count}`);
      console.log(`System names: ${systems.join(', ')}`);
    } else {
      console.log('Repository not found');
    }
    
    console.log('\n=== QUERY 4: Check for Constraints on HAS_SOURCE_IN ===\n');
    
    const result4 = await session.run(`
      SHOW CONSTRAINTS
      YIELD name, type, entityType, labelsOrTypes, properties
      WHERE type CONTAINS 'RELATIONSHIP' OR labelsOrTypes = ['HAS_SOURCE_IN']
      RETURN name, type, entityType, labelsOrTypes, properties
    `);
    
    if (result4.records.length > 0) {
      console.log('Relationship Constraints Found:');
      result4.records.forEach(record => {
        console.log(`  - ${record.get('name')}: ${record.get('type')}`);
      });
    } else {
      console.log('No relationship constraints found on HAS_SOURCE_IN');
    }
    
    console.log('\n=== QUERY 5: Statistics ===\n');
    
    const result5 = await session.run(`
      MATCH (r:Repository)
      OPTIONAL MATCH (s:System)-[:HAS_SOURCE_IN]->(r)
      WITH r, count(s) as systemCount
      RETURN 
        count(r) as totalRepositories,
        sum(CASE WHEN systemCount = 0 THEN 1 ELSE 0 END) as orphanedRepos,
        sum(CASE WHEN systemCount = 1 THEN 1 ELSE 0 END) as singleSystemRepos,
        sum(CASE WHEN systemCount > 1 THEN 1 ELSE 0 END) as multiSystemRepos,
        max(systemCount) as maxSystemsPerRepo,
        avg(systemCount) as avgSystemsPerRepo
    `);
    
    if (result5.records.length > 0) {
      const stats = result5.records[0];
      console.log(`Total Repositories: ${stats.get('totalRepositories').toNumber()}`);
      console.log(`Orphaned (no systems): ${stats.get('orphanedRepos').toNumber()}`);
      console.log(`Single system: ${stats.get('singleSystemRepos').toNumber()}`);
      console.log(`Multiple systems: ${stats.get('multiSystemRepos').toNumber()}`);
      console.log(`Max systems per repo: ${stats.get('maxSystemsPerRepo').toNumber()}`);
      console.log(`Avg systems per repo: ${stats.get('avgSystemsPerRepo').toFixed(2)}`);
    }
    
  } finally {
    await session.close();
  }
}

runQueries()
  .then(() => {
    console.log('\n✅ Queries completed successfully');
    driver.close();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    driver.close();
    process.exit(1);
  });
