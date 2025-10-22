import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import neo4j, { Driver } from 'neo4j-driver'

describe('Policy Enforcement', () => {
  let driver: Driver
  const testPrefix = 'policy_test_'

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
          vendor: 'Meta',
          status: 'approved',
          riskLevel: 'low'
        })
        CREATE (oldLib:Technology {
          name: $oldLibName,
          category: 'library',
          vendor: 'Unknown',
          status: 'deprecated',
          riskLevel: 'high'
        })
      `, {
        reactName: `${testPrefix}React`,
        oldLibName: `${testPrefix}OldLib`
      })

      // Create test policies
      await session.run(`
        CREATE (orgPolicy:Policy {
          name: $orgPolicyName,
          description: 'Organization-wide security policy',
          ruleType: 'security',
          severity: 'error',
          effectiveDate: date('2025-01-01'),
          expiryDate: null,
          enforcedBy: $securityName,
          scope: 'organization',
          status: 'active'
        })
        CREATE (domainPolicy:Policy {
          name: $domainPolicyName,
          description: 'Frontend-specific policy',
          ruleType: 'compliance',
          severity: 'warning',
          effectiveDate: date('2025-01-01'),
          expiryDate: null,
          enforcedBy: $frontendName,
          scope: 'frontend',
          status: 'active'
        })
        CREATE (expiredPolicy:Policy {
          name: $expiredPolicyName,
          description: 'Expired policy',
          ruleType: 'compliance',
          severity: 'info',
          effectiveDate: date('2024-01-01'),
          expiryDate: date('2024-12-31'),
          enforcedBy: $securityName,
          scope: 'organization',
          status: 'archived'
        })
      `, {
        orgPolicyName: `${testPrefix}OrgPolicy`,
        domainPolicyName: `${testPrefix}DomainPolicy`,
        expiredPolicyName: `${testPrefix}ExpiredPolicy`,
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

  describe('Policy Properties', () => {
    it('should create policy with all enhanced properties', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:Policy {name: $name})
          RETURN p.name as name,
                 p.description as description,
                 p.ruleType as ruleType,
                 p.severity as severity,
                 p.effectiveDate as effectiveDate,
                 p.expiryDate as expiryDate,
                 p.enforcedBy as enforcedBy,
                 p.scope as scope,
                 p.status as status
        `, { name: `${testPrefix}OrgPolicy` })

        expect(result.records).toHaveLength(1)
        const policy = result.records[0]
        expect(policy.get('name')).toBe(`${testPrefix}OrgPolicy`)
        expect(policy.get('ruleType')).toBe('security')
        expect(policy.get('severity')).toBe('error')
        expect(policy.get('enforcedBy')).toBe(`${testPrefix}Security`)
        expect(policy.get('scope')).toBe('organization')
        expect(policy.get('status')).toBe('active')
        expect(policy.get('effectiveDate')).toBeTruthy()
        expect(policy.get('expiryDate')).toBeNull()
      } finally {
        await session.close()
      }
    })

    it('should handle expired policies', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:Policy {name: $name})
          RETURN p.expiryDate as expiryDate,
                 p.status as status
        `, { name: `${testPrefix}ExpiredPolicy` })

        expect(result.records).toHaveLength(1)
        const policy = result.records[0]
        expect(policy.get('expiryDate')).toBeTruthy()
        expect(policy.get('status')).toBe('archived')
      } finally {
        await session.close()
      }
    })
  })

  describe('ENFORCES Relationship', () => {
    it('should create ENFORCES relationship', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:Policy {name: $policyName})
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgPolicy`
        })

        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:Policy {name: $policyName})
          RETURN count(*) as count
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgPolicy`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    it('should find all policies enforced by a team', async () => {
      const session = driver.session()
      try {
        // Create enforcement relationships
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:Policy)
          WHERE policy.name IN [$policy1, $policy2]
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policy1: `${testPrefix}OrgPolicy`,
          policy2: `${testPrefix}ExpiredPolicy`
        })

        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:Policy)
          RETURN collect(policy.name) as policies
        `, { teamName: `${testPrefix}Security` })

        const policies = result.records[0].get('policies')
        expect(policies).toContain(`${testPrefix}OrgPolicy`)
        expect(policies).toContain(`${testPrefix}ExpiredPolicy`)
      } finally {
        await session.close()
      }
    })
  })

  describe('SUBJECT_TO Relationship', () => {
    it('should create SUBJECT_TO relationship', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:Policy {name: $policyName})
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          teamName: `${testPrefix}Frontend`,
          policyName: `${testPrefix}OrgPolicy`
        })

        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(policy:Policy {name: $policyName})
          RETURN count(*) as count
        `, {
          teamName: `${testPrefix}Frontend`,
          policyName: `${testPrefix}OrgPolicy`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    it('should apply organization-wide policies to all teams', async () => {
      const session = driver.session()
      try {
        // Create SUBJECT_TO relationships for organization policy
        await session.run(`
          MATCH (policy:Policy {name: $policyName, scope: 'organization'})
          MATCH (team:Team)
          WHERE team.name STARTS WITH $prefix
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          prefix: testPrefix
        })

        const result = await session.run(`
          MATCH (team:Team)-[:SUBJECT_TO]->(policy:Policy {name: $policyName})
          WHERE team.name STARTS WITH $prefix
          RETURN count(DISTINCT team) as teamCount
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          prefix: testPrefix
        })

        expect(result.records[0].get('teamCount').toNumber()).toBe(3)
      } finally {
        await session.close()
      }
    })

    it('should apply domain-specific policies only to teams in that domain', async () => {
      const session = driver.session()
      try {
        // Create SUBJECT_TO relationships for domain policy
        await session.run(`
          MATCH (policy:Policy {name: $policyName})
          MATCH (team:Team {responsibilityArea: 'frontend'})
          WHERE team.name STARTS WITH $prefix
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          policyName: `${testPrefix}DomainPolicy`,
          prefix: testPrefix
        })

        const result = await session.run(`
          MATCH (team:Team)-[:SUBJECT_TO]->(policy:Policy {name: $policyName})
          WHERE team.name STARTS WITH $prefix
          RETURN collect(team.name) as teams
        `, {
          policyName: `${testPrefix}DomainPolicy`,
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

  describe('GOVERNS Relationship', () => {
    it('should create GOVERNS relationship to technology', async () => {
      const session = driver.session()
      try {
        await session.run(`
          MATCH (policy:Policy {name: $policyName})
          MATCH (tech:Technology {name: $techName})
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          techName: `${testPrefix}React`
        })

        const result = await session.run(`
          MATCH (policy:Policy {name: $policyName})-[:GOVERNS]->(tech:Technology {name: $techName})
          RETURN count(*) as count
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          techName: `${testPrefix}React`
        })

        expect(result.records[0].get('count').toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    it('should find all technologies governed by a policy', async () => {
      const session = driver.session()
      try {
        // Create GOVERNS relationships
        await session.run(`
          MATCH (policy:Policy {name: $policyName})
          MATCH (tech:Technology)
          WHERE tech.name IN [$tech1, $tech2]
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          tech1: `${testPrefix}React`,
          tech2: `${testPrefix}OldLib`
        })

        const result = await session.run(`
          MATCH (policy:Policy {name: $policyName})-[:GOVERNS]->(tech:Technology)
          RETURN collect(tech.name) as technologies
        `, { policyName: `${testPrefix}OrgPolicy` })

        const technologies = result.records[0].get('technologies')
        expect(technologies).toContain(`${testPrefix}React`)
        expect(technologies).toContain(`${testPrefix}OldLib`)
      } finally {
        await session.close()
      }
    })

    it('should find policies governing high-risk technologies', async () => {
      const session = driver.session()
      try {
        // Create GOVERNS relationship for high-risk tech
        await session.run(`
          MATCH (policy:Policy {name: $policyName})
          MATCH (tech:Technology {name: $techName})
          MERGE (policy)-[:GOVERNS]->(tech)
        `, {
          policyName: `${testPrefix}OrgPolicy`,
          techName: `${testPrefix}OldLib`
        })

        const result = await session.run(`
          MATCH (policy:Policy)-[:GOVERNS]->(tech:Technology)
          WHERE tech.riskLevel IN ['high', 'critical']
            AND tech.name STARTS WITH $prefix
          RETURN policy.name as policyName, tech.name as techName, tech.riskLevel as riskLevel
        `, { prefix: testPrefix })

        expect(result.records.length).toBeGreaterThan(0)
        const record = result.records[0]
        expect(record.get('policyName')).toBe(`${testPrefix}OrgPolicy`)
        expect(record.get('techName')).toBe(`${testPrefix}OldLib`)
        expect(record.get('riskLevel')).toBe('high')
      } finally {
        await session.close()
      }
    })
  })

  describe('Policy Queries', () => {
    it('should find active policies', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:Policy {status: 'active'})
          WHERE p.name STARTS WITH $prefix
          RETURN count(*) as count
        `, { prefix: testPrefix })

        expect(result.records[0].get('count').toNumber()).toBeGreaterThanOrEqual(2)
      } finally {
        await session.close()
      }
    })

    it('should find policies by scope', async () => {
      const session = driver.session()
      try {
        const result = await session.run(`
          MATCH (p:Policy {scope: 'organization'})
          WHERE p.name STARTS WITH $prefix
          RETURN collect(p.name) as policies
        `, { prefix: testPrefix })

        const policies = result.records[0].get('policies')
        expect(policies).toContain(`${testPrefix}OrgPolicy`)
      } finally {
        await session.close()
      }
    })

    it('should find policies enforced by a specific team', async () => {
      const session = driver.session()
      try {
        // Ensure enforcement relationship exists
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:Policy {name: $policyName})
          MERGE (team)-[:ENFORCES]->(policy)
        `, {
          teamName: `${testPrefix}Security`,
          policyName: `${testPrefix}OrgPolicy`
        })

        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:ENFORCES]->(policy:Policy)
          RETURN collect(policy.name) as policies
        `, { teamName: `${testPrefix}Security` })

        const policies = result.records[0].get('policies')
        expect(policies).toContain(`${testPrefix}OrgPolicy`)
      } finally {
        await session.close()
      }
    })

    it('should find all compliance requirements for a team', async () => {
      const session = driver.session()
      try {
        // Setup relationships
        await session.run(`
          MATCH (team:Team {name: $teamName})
          MATCH (policy:Policy)
          WHERE policy.name IN [$policy1, $policy2]
          MERGE (team)-[:SUBJECT_TO]->(policy)
        `, {
          teamName: `${testPrefix}Frontend`,
          policy1: `${testPrefix}OrgPolicy`,
          policy2: `${testPrefix}DomainPolicy`
        })

        const result = await session.run(`
          MATCH (team:Team {name: $teamName})-[:SUBJECT_TO]->(policy:Policy {status: 'active'})
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

        expect(result.records.length).toBeGreaterThanOrEqual(1)
        const firstPolicy = result.records[0]
        expect(firstPolicy.get('policyName')).toBeTruthy()
        expect(firstPolicy.get('severity')).toBeTruthy()
      } finally {
        await session.close()
      }
    })
  })
})
