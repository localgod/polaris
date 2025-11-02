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

async function testMultiSystemRepo() {
  const session = driver.session();
  
  try {
    console.log('\n=== TEST: Can One Repository Be Linked to Multiple Systems? ===\n');
    
    // Create a test repository
    const testRepoUrl = 'https://github.com/company/shared-library';
    
    console.log('Step 1: Create a shared repository...');
    await session.run(`
      MERGE (r:Repository {url: $url})
      SET r.scmType = 'git',
          r.name = 'shared-library',
          r.description = 'Shared utility library used by multiple systems',
          r.isPublic = false,
          r.requiresAuth = true,
          r.defaultBranch = 'main',
          r.createdAt = COALESCE(r.createdAt, datetime()),
          r.lastSyncedAt = datetime()
    `, { url: testRepoUrl });
    console.log('✅ Repository created');
    
    // Create two test systems
    console.log('\nStep 2: Create two test systems...');
    await session.run(`
      MERGE (team:Team {name: 'Test Team'})
      SET team.email = 'test@company.com',
          team.responsibilityArea = 'testing'
      
      MERGE (s1:System {name: 'test-system-1'})
      SET s1.domain = 'test',
          s1.businessCriticality = 'low',
          s1.environment = 'dev',
          s1.sourceCodeType = 'proprietary',
          s1.hasSourceAccess = true
      MERGE (team)-[:OWNS]->(s1)
      
      MERGE (s2:System {name: 'test-system-2'})
      SET s2.domain = 'test',
          s2.businessCriticality = 'low',
          s2.environment = 'dev',
          s2.sourceCodeType = 'proprietary',
          s2.hasSourceAccess = true
      MERGE (team)-[:OWNS]->(s2)
    `);
    console.log('✅ Systems created: test-system-1, test-system-2');
    
    // Link both systems to the same repository
    console.log('\nStep 3: Link both systems to the same repository...');
    await session.run(`
      MATCH (r:Repository {url: $url})
      MATCH (s1:System {name: 'test-system-1'})
      MATCH (s2:System {name: 'test-system-2'})
      
      MERGE (s1)-[rel1:HAS_SOURCE_IN]->(r)
      SET rel1.addedAt = COALESCE(rel1.addedAt, datetime())
      
      MERGE (s2)-[rel2:HAS_SOURCE_IN]->(r)
      SET rel2.addedAt = COALESCE(rel2.addedAt, datetime())
    `, { url: testRepoUrl });
    console.log('✅ Both systems linked to the repository');
    
    // Verify the relationships
    console.log('\nStep 4: Verify the relationships...');
    const result = await session.run(`
      MATCH (r:Repository {url: $url})
      MATCH (s:System)-[rel:HAS_SOURCE_IN]->(r)
      RETURN r.url as repository,
             r.name as repoName,
             collect(s.name) as systems,
             count(s) as systemCount
    `, { url: testRepoUrl });
    
    if (result.records.length > 0) {
      const record = result.records[0];
      const systems = record.get('systems');
      const count = record.get('systemCount').toNumber();
      
      console.log(`\nRepository: ${record.get('repository')}`);
      console.log(`Systems linked: ${count}`);
      console.log(`System names: ${systems.join(', ')}`);
      
      if (count >= 2) {
        console.log('\n✅ SUCCESS: One repository CAN be linked to multiple systems!');
      } else {
        console.log('\n❌ FAILED: Expected 2 or more systems, got', count);
      }
    }
    
    // Test: Query systems by repository URL
    console.log('\n=== TEST: Query Systems by Repository URL ===\n');
    
    const queryResult = await session.run(`
      MATCH (r:Repository {url: $url})<-[:HAS_SOURCE_IN]-(s:System)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
      RETURN s.name as systemName,
             s.domain as domain,
             s.businessCriticality as criticality,
             team.name as ownerTeam
      ORDER BY s.name
    `, { url: testRepoUrl });
    
    console.log('Systems found for repository:', testRepoUrl);
    console.log('System Name | Domain | Criticality | Owner Team');
    console.log('-'.repeat(80));
    queryResult.records.forEach(record => {
      console.log(`${record.get('systemName')} | ${record.get('domain')} | ${record.get('criticality')} | ${record.get('ownerTeam')}`);
    });
    
    // Cleanup
    console.log('\n=== Cleanup ===\n');
    await session.run(`
      MATCH (s:System) WHERE s.name IN ['test-system-1', 'test-system-2']
      DETACH DELETE s
      WITH 1 as dummy
      MATCH (r:Repository {url: $url})
      DETACH DELETE r
      WITH 1 as dummy
      MATCH (t:Team {name: 'Test Team'})
      WHERE NOT (t)-[:OWNS]->(:System)
      DELETE t
    `, { url: testRepoUrl });
    console.log('✅ Test data cleaned up');
    
  } finally {
    await session.close();
  }
}

testMultiSystemRepo()
  .then(() => {
    console.log('\n✅ All tests completed successfully');
    driver.close();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    driver.close();
    process.exit(1);
  });
