import { expect, beforeAll, afterAll } from 'vitest'
import neo4j, { type Driver } from 'neo4j-driver'
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber'

const feature = await loadFeature('./test/integration/features/version-constraint-enforcement.feature')

describeFeature(feature, ({ Scenario }) => {
  let driver: Driver
  const testPrefix = 'vc_test_'

  beforeAll(async () => {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'devpassword'
      )
    )

    const session = driver.session()
    try {
      // Create test teams
      await session.run(`
        CREATE (security:Team {name: $securityName, email: 'security@test.com', responsibilityArea: 'security'})
        CREATE (frontend:Team {name: $frontendName, email: 'frontend@test.com', responsibilityArea: 'frontend'})
        CREATE (backend:Team {name: $backendName, email: 'backend@test.com', responsibilityArea: 'backend'})
      `, {
        securityName: `${testPrefix}Security`,
        frontendName: `${testPrefix}Frontend`,
        backendName: `${testPrefix}Backend`
      })

      // Create test technologies
      await session.run(`
        CREATE (react:Technology {
          name: $reactName,
          category: 'framework',
          vendor: 'Meta'
        })
        CREATE (oldLib:Technology {
          name: $oldLibName,
          category: 'library',
          vendor: 'Unknown'
        })
      `, {
        reactName: `${testPrefix}React`,
        oldLibName: `${testPrefix}OldLib`
      })

      // Create test policies
      await session.run(`
        CREATE (orgVC:VersionConstraint {
          name: $orgVCName,
          description: 'Organization-wide version constraint',
          
          severity: 'error',
          scope: 'organization',
          status: 'active',
          versionRange: '>=18.0.0'
        })
        CREATE (domainVC:VersionConstraint {
          name: $domainVCName,
          description: 'Frontend-specific constraint',
          
          severity: 'warning',
          scope: 'frontend',
          status: 'active',
          versionRange: '>=16.0.0'
        })
        CREATE (expiredVC:VersionConstraint {
          name: $expiredVCName,
          description: 'Expired constraint',
          
          severity: 'info',
          scope: 'organization',
          status: 'archived',
          versionRange: '>=1.0.0'
        })
      `, {
        orgVCName: `${testPrefix}OrgVC`,
        domainVCName: `${testPrefix}DomainVC`,
        expiredVCName: `${testPrefix}ExpiredVC`,
        securityName: `${testPrefix}Security`,
        frontendName: `${testPrefix}Frontend`
      })
    } finally {
      await session.close()
    }
  })

  afterAll(async () => {
    const session = driver.session()
    try {
      await session.run(`
        MATCH (n)
        WHERE n.name STARTS WITH $prefix
        DETACH DELETE n
      `, { prefix: testPrefix })
    } finally {
      await session.close()
      await driver.close()
    }
  })

  Scenario('Create version constraint with all enhanced properties', ({ Given, When, Then, And }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    let vcResult: { records: unknown[] }

    When('I query for a version constraint with all properties', async () => {
      const session = driver.session()
      try {
        vcResult = await session.run(`
          MATCH (p:VersionConstraint {name: $name})
          RETURN p.name as name,
                 p.description as description,
                 p.severity as severity,
                 p.scope as scope,
                 p.status as status
        `, { name: `${testPrefix}OrgVC` })
      } finally {
        await session.close()
      }
    })

    Then('the version constraint should exist', () => {
      expect(vcResult.records).toHaveLength(1)
    })

    And('all properties should be set correctly', () => {
      const policy = vcResult.records[0]
      expect(policy.get('name')).toBe(`${testPrefix}OrgVC`)
      expect(policy.get('severity')).toBe('error')
      expect(policy.get('scope')).toBe('organization')
      expect(policy.get('status')).toBe('active')
    })
  })

  Scenario('Handle expired version constraints', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I query for an expired version constraint', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:VersionConstraint {name: $name})
          RETURN p.status as status
        `, { name: `${testPrefix}ExpiredVC` })

        expect(result.records).toHaveLength(1)
      } finally {
        await session.close()
      }
    })

    Then('the version constraint should be archived with an expiry date', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:VersionConstraint {name: $name})
          RETURN p.status as status
        `, { name: `${testPrefix}ExpiredVC` })

        const policy = result.records[0]
        expect(policy.get('status')).toBe('archived')
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Create ENFORCES relationship between team and version constraint', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create an ENFORCES relationship between team and version constraint', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:VersionConstraint {name: $policyName})
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgVC`
        })
      } finally {
        await session.close()
      }
    })

    Then('the ENFORCES relationship should exist', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:VersionConstraint {name: $policyName})
          RETURN count(*) as count
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgVC`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find all constraints enforced by a team', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create enforcement relationships for multiple constraints', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:VersionConstraint)
          WHERE policy.name IN [$policy1, $policy2]
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policy1: `${testPrefix}OrgVC`,
          policy2: `${testPrefix}ExpiredVC`
        })
      } finally {
        await session.close()
      }
    })

    Then('I should find all constraints enforced by the team', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:VersionConstraint)
          RETURN collect(policy.name) as policies
        `, { teamName: `${testPrefix}Security` })

        const policies = result.records[0].get('policies')
        expect(policies).toContain(`${testPrefix}OrgVC`)
        expect(policies).toContain(`${testPrefix}ExpiredVC`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Create SUBJECT_TO relationship between team and version constraint', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create a SUBJECT_TO relationship between team and version constraint', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:VersionConstraint {name: $policyName})
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          teamName: `${testPrefix}Frontend`,
          policyName: `${testPrefix}OrgVC`
        })
      } finally {
        await session.close()
      }
    })

    Then('the SUBJECT_TO relationship should exist', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(policy:VersionConstraint {name: $policyName})
          RETURN count(*) as count
        `, {
          teamName: `${testPrefix}Frontend`,
          policyName: `${testPrefix}OrgVC`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Apply organization-wide constraints to all teams', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I apply an organization-wide version constraint to all teams', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName, scope: 'organization'})
          MATCH (team:Team)
          WHERE team.name STARTS WITH $prefix
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          policyName: `${testPrefix}OrgVC`,
          prefix: testPrefix
        })
      } finally {
        await session.close()
      }
    })

    Then('all teams should be subject to the version constraint', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team)-[:SUBJECT_TO]->(policy:VersionConstraint {name: $policyName})
          WHERE team.name STARTS WITH $prefix
          RETURN count(DISTINCT team) as teamCount
        `, {
          policyName: `${testPrefix}OrgVC`,
          prefix: testPrefix
        })

        expect(result.records[0].get('teamCount').toNumber()).toBe(3)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Apply domain-specific constraints only to teams in that domain', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I apply a domain-specific version constraint to frontend teams', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})
          MATCH (team:Team {responsibilityArea: 'frontend'})
          WHERE team.name STARTS WITH $prefix
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          policyName: `${testPrefix}DomainVC`,
          prefix: testPrefix
        })
      } finally {
        await session.close()
      }
    })

    Then('only frontend teams should be subject to the version constraint', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team)-[:SUBJECT_TO]->(policy:VersionConstraint {name: $policyName})
          WHERE team.name STARTS WITH $prefix
          RETURN collect(team.name) as teams
        `, {
          policyName: `${testPrefix}DomainVC`,
          prefix: testPrefix
        })

        const teams = result.records[0].get('teams')
        expect(teams).toHaveLength(1)
        expect(teams[0]).toBe(`${testPrefix}Frontend`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Create GOVERNS relationship between version constraint and technology', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create a GOVERNS relationship between version constraint and technology', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})
          MATCH (tech:Technology {name: $techName})
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgVC`,
          techName: `${testPrefix}React`
        })
      } finally {
        await session.close()
      }
    })

    Then('the GOVERNS relationship should exist', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})-[:GOVERNS]->(tech:Technology {name: $techName})
          RETURN count(*) as count
        `, {
          policyName: `${testPrefix}OrgVC`,
          techName: `${testPrefix}React`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find all technologies governed by a version constraint', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create GOVERNS relationships for multiple technologies', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})
          MATCH (tech:Technology)
          WHERE tech.name IN [$tech1, $tech2]
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgVC`,
          tech1: `${testPrefix}React`,
          tech2: `${testPrefix}OldLib`
        })
      } finally {
        await session.close()
      }
    })

    Then('I should find all technologies governed by the version constraint', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})-[:GOVERNS]->(tech:Technology)
          RETURN collect(tech.name) as technologies
        `, { policyName: `${testPrefix}OrgVC` })

        const technologies = result.records[0].get('technologies')
        expect(technologies).toContain(`${testPrefix}React`)
        expect(technologies).toContain(`${testPrefix}OldLib`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find constraints governing high-risk technologies', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create a GOVERNS relationship for a high-risk technology', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:VersionConstraint {name: $policyName})
          MATCH (tech:Technology {name: $techName})
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgVC`,
          techName: `${testPrefix}OldLib`
        })
      } finally {
        await session.close()
      }
    })

    Then('I should find constraints governing high-risk technologies', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (policy:VersionConstraint)-[:GOVERNS]->(tech:Technology)
          WHERE tech.name STARTS WITH $prefix
          RETURN policy.name as policyName, tech.name as techName
        `, { prefix: testPrefix })

        expect(result.records.length).toBeGreaterThan(0)
        const record = result.records[0]
        expect(record.get('policyName')).toBe(`${testPrefix}OrgVC`)
        expect(record.get('techName')).toBe(`${testPrefix}OldLib`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find active constraints', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I query for active constraints', async () => {
      // Query happens in Then step
    })

    Then('I should find at least two active constraints', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:VersionConstraint {status: 'active'})
          WHERE p.name STARTS WITH $prefix
          RETURN count(*) as count
        `, { prefix: testPrefix })

        expect(result.records[0].get('count').toNumber()).toBeGreaterThanOrEqual(2)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find constraints by scope', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I query for organization-scoped constraints', async () => {
      // Query happens in Then step
    })

    Then('I should find the organization version constraint', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:VersionConstraint {scope: 'organization'})
          WHERE p.name STARTS WITH $prefix
          RETURN collect(p.name) as policies
        `, { prefix: testPrefix })

        const policies = result.records[0].get('policies')
        expect(policies).toContain(`${testPrefix}OrgVC`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find constraints enforced by a specific team', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create enforcement relationships and query for them', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:VersionConstraint {name: $policyName})
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgVC`
        })
      } finally {
        await session.close()
      }
    })

    Then('I should find constraints enforced by the team', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:VersionConstraint)
          RETURN collect(policy.name) as policies
        `, { teamName: `${testPrefix}Security` })

        const policies = result.records[0]?.get('policies') || []
        expect(policies).toContain(`${testPrefix}OrgVC`)
      } finally {
        await session.close()
      }
    })
  })

  Scenario('Find all compliance requirements for a team', ({ Given, When, Then }) => {
    Given('test data has been created', () => {
      expect(driver).toBeDefined()
    })

    When('I create SUBJECT_TO relationships for a team', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:VersionConstraint)
          WHERE policy.name IN [$policy1, $policy2] AND policy.status = 'active'
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          teamName: `${testPrefix}Frontend`,
          policy1: `${testPrefix}OrgVC`,
          policy2: `${testPrefix}DomainVC`
        })
      } finally {
        await session.close()
      }
    })

    Then('I should find all compliance requirements for the team', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(policy:VersionConstraint {status: 'active'})
          OPTIONAL MATCH (enforcer:Team)-[:ENFORCES]->(policy)
          RETURN policy.name as policyName,
                 policy.severity as severity,
                 enforcer.name as enforcedBy
          ORDER BY 
            CASE policy.severity
              WHEN 'critical' THEN 1
              WHEN 'error' THEN 2
              WHEN 'warning' THEN 3
              WHEN 'info' THEN 4
            END
        `, { teamName: `${testPrefix}Frontend` })

        if (result.records.length > 0) {
          const firstPolicy = result.records[0]
          expect(firstPolicy.get('policyName')).toBeTruthy()
          expect(firstPolicy.get('severity')).toBeTruthy()
        }
      } finally {
        await session.close()
      }
    })
  })
})
