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

async function testSBOMUpdateScenario() {
  const session = driver.session();
  
  try {
    console.log('\n=== SCENARIO: Push SBOM with Repository URL, Update ALL Associated Systems ===\n');
    
    // Setup: Create a monorepo scenario
    const monorepoUrl = 'https://github.com/company/monorepo';
    
    console.log('Step 1: Setup - Create a monorepo with multiple systems...\n');
    
    await session.run(`
      MERGE (team:Team {name: 'Platform Team'})
      SET team.email = 'platform@company.com',
          team.responsibilityArea = 'platform'
      
      MERGE (repo:Repository {url: $repoUrl})
      SET repo.scmType = 'git',
          repo.name = 'monorepo',
          repo.description = 'Monorepo containing multiple services',
          repo.isPublic = false,
          repo.requiresAuth = true,
          repo.defaultBranch = 'main',
          repo.createdAt = COALESCE(repo.createdAt, datetime()),
          repo.lastSyncedAt = datetime()
      
      MERGE (s1:System {name: 'frontend-app'})
      SET s1.domain = 'customer-experience',
          s1.businessCriticality = 'high',
          s1.environment = 'prod',
          s1.sourceCodeType = 'proprietary',
          s1.hasSourceAccess = true
      MERGE (team)-[:OWNS]->(s1)
      MERGE (s1)-[:HAS_SOURCE_IN]->(repo)
      
      MERGE (s2:System {name: 'backend-api'})
      SET s2.domain = 'platform',
          s2.businessCriticality = 'critical',
          s2.environment = 'prod',
          s2.sourceCodeType = 'proprietary',
          s2.hasSourceAccess = true
      MERGE (team)-[:OWNS]->(s2)
      MERGE (s2)-[:HAS_SOURCE_IN]->(repo)
      
      MERGE (s3:System {name: 'admin-service'})
      SET s3.domain = 'internal-tools',
          s3.businessCriticality = 'medium',
          s3.environment = 'prod',
          s3.sourceCodeType = 'proprietary',
          s3.hasSourceAccess = true
      MERGE (team)-[:OWNS]->(s3)
      MERGE (s3)-[:HAS_SOURCE_IN]->(repo)
    `, { repoUrl: monorepoUrl });
    
    console.log('✅ Created monorepo with 3 systems:');
    console.log('   - frontend-app (high criticality)');
    console.log('   - backend-api (critical)');
    console.log('   - admin-service (medium)');
    
    // Step 2: Query to find all systems for a repository
    console.log('\n\nStep 2: Query systems by repository URL...\n');
    
    const systemsResult = await session.run(`
      MATCH (r:Repository {url: $repoUrl})<-[:HAS_SOURCE_IN]-(s:System)
      OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
      RETURN s.name as systemName,
             s.domain as domain,
             s.businessCriticality as criticality,
             s.environment as environment,
             team.name as ownerTeam
      ORDER BY 
        CASE s.businessCriticality
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        s.name
    `, { repoUrl: monorepoUrl });
    
    console.log(`Repository: ${monorepoUrl}`);
    console.log(`Found ${systemsResult.records.length} systems:\n`);
    console.log('System Name      | Domain              | Criticality | Environment | Owner Team');
    console.log('-'.repeat(90));
    
    const systemNames: string[] = [];
    systemsResult.records.forEach(record => {
      const name = record.get('systemName');
      systemNames.push(name);
      console.log(
        `${name.padEnd(16)} | ${record.get('domain').padEnd(19)} | ${record.get('criticality').padEnd(11)} | ${record.get('environment').padEnd(11)} | ${record.get('ownerTeam')}`
      );
    });
    
    // Step 3: Simulate SBOM update for all systems
    console.log('\n\nStep 3: Simulate SBOM update - Add components to ALL systems...\n');
    
    const sbomComponents = [
      { name: 'react', version: '18.2.0', packageManager: 'npm', license: 'MIT' },
      { name: 'express', version: '4.18.2', packageManager: 'npm', license: 'MIT' },
      { name: 'typescript', version: '5.3.3', packageManager: 'npm', license: 'Apache-2.0' }
    ];
    
    for (const comp of sbomComponents) {
      await session.run(`
        MATCH (r:Repository {url: $repoUrl})<-[:HAS_SOURCE_IN]-(s:System)
        
        MERGE (c:Component {
          name: $name,
          version: $version,
          packageManager: $packageManager
        })
        SET c.license = $license,
            c.hash = 'sha256:test-' + $name + '-' + $version,
            c.sourceRepo = 'https://github.com/example/' + $name,
            c.importPath = $name
        
        MERGE (s)-[:USES]->(c)
      `, {
        repoUrl: monorepoUrl,
        name: comp.name,
        version: comp.version,
        packageManager: comp.packageManager,
        license: comp.license
      });
    }
    
    console.log(`✅ Added ${sbomComponents.length} components to all ${systemNames.length} systems`);
    
    // Step 4: Verify components were added to all systems
    console.log('\n\nStep 4: Verify components in each system...\n');
    
    for (const systemName of systemNames) {
      const compResult = await session.run(`
        MATCH (s:System {name: $systemName})-[:USES]->(c:Component)
        RETURN c.name as componentName,
               c.version as version,
               c.packageManager as packageManager
        ORDER BY c.name
      `, { systemName });
      
      console.log(`\n${systemName}:`);
      compResult.records.forEach(record => {
        console.log(`  - ${record.get('componentName')}@${record.get('version')} (${record.get('packageManager')})`);
      });
    }
    
    // Step 5: Show the query pattern for SBOM updates
    console.log('\n\n=== QUERY PATTERN FOR SBOM UPDATES ===\n');
    console.log('To update SBOM for all systems associated with a repository:\n');
    console.log('```cypher');
    console.log('// 1. Find all systems for the repository');
    console.log('MATCH (r:Repository {url: $repositoryUrl})<-[:HAS_SOURCE_IN]-(s:System)');
    console.log('');
    console.log('// 2. For each component in the SBOM');
    console.log('MERGE (c:Component {');
    console.log('  name: $componentName,');
    console.log('  version: $componentVersion,');
    console.log('  packageManager: $packageManager');
    console.log('})');
    console.log('SET c.license = $license,');
    console.log('    c.hash = $hash,');
    console.log('    c.sourceRepo = $sourceRepo,');
    console.log('    c.importPath = $importPath');
    console.log('');
    console.log('// 3. Link component to all systems');
    console.log('MERGE (s)-[:USES]->(c)');
    console.log('```\n');
    
    // Cleanup
    console.log('\n=== Cleanup ===\n');
    await session.run(`
      MATCH (s:System) WHERE s.name IN ['frontend-app', 'backend-api', 'admin-service']
      DETACH DELETE s
      WITH 1 as dummy
      MATCH (r:Repository {url: $repoUrl})
      DETACH DELETE r
      WITH 1 as dummy
      MATCH (c:Component) WHERE c.hash STARTS WITH 'sha256:test-'
      DETACH DELETE c
      WITH 1 as dummy
      MATCH (t:Team {name: 'Platform Team'})
      WHERE NOT (t)-[:OWNS]->(:System)
      DELETE t
    `, { repoUrl: monorepoUrl });
    console.log('✅ Test data cleaned up');
    
    console.log('\n=== CONCLUSION ===\n');
    console.log('✅ One repository CAN be linked to multiple systems via HAS_SOURCE_IN');
    console.log('✅ The relationship is many-to-many (no constraints prevent this)');
    console.log('✅ You can query all systems by repository URL');
    console.log('✅ SBOM updates can target all systems associated with a repository');
    console.log('\nThis approach is FULLY SUPPORTED by the current data model!');
    
  } finally {
    await session.close();
  }
}

testSBOMUpdateScenario()
  .then(() => {
    console.log('\n✅ Scenario test completed successfully\n');
    driver.close();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    driver.close();
    process.exit(1);
  });
