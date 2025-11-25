#!/usr/bin/env node

/**
 * Query Neo4j Schema Visualization
 * 
 * This script queries the Neo4j database schema using db.schema.visualization()
 * and outputs the results in a readable format.
 * 
 * Usage:
 *   npm run schema:query
 *   npm run schema:query -- --json  (for JSON output)
 */

import neo4j from 'neo4j-driver';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

async function querySchema() {
  const session = driver.session();
  
  try {
    console.log('Connecting to Neo4j...');
    console.log(`URI: ${NEO4J_URI}`);
    console.log('');
    
    const result = await session.run('CALL db.schema.visualization()');
    
    if (result.records.length === 0) {
      console.log('No schema data returned.');
      return;
    }
    
    const record = result.records[0];
    const nodes = record.get('nodes');
    const relationships = record.get('relationships');
    
    // Check if --json flag is present
    const jsonOutput = process.argv.includes('--json');
    
    if (jsonOutput) {
      // Output raw JSON
      console.log(JSON.stringify({ nodes, relationships }, null, 2));
    } else {
      // Human-readable output
      console.log('='.repeat(80));
      console.log('NEO4J SCHEMA VISUALIZATION');
      console.log('='.repeat(80));
      console.log('');
      
      // Node Types
      console.log(`NODE TYPES (${nodes.length} total)`);
      console.log('-'.repeat(80));
      nodes.forEach((node, index) => {
        const labels = node.labels.join(', ');
        const props = node.properties;
        
        console.log(`${index + 1}. ${labels}`);
        
        if (props.indexes && props.indexes.length > 0) {
          console.log(`   Indexes: ${props.indexes.join(', ')}`);
        }
        
        if (props.constraints && props.constraints.length > 0) {
          console.log(`   Constraints:`);
          props.constraints.forEach(constraint => {
            console.log(`     - ${constraint}`);
          });
        }
        
        console.log('');
      });
      
      // Relationship Types
      console.log('');
      console.log(`RELATIONSHIP TYPES (${relationships.length} total)`);
      console.log('-'.repeat(80));
      
      // Group relationships by type
      const relationshipsByType = {};
      relationships.forEach(rel => {
        const type = rel.type;
        if (!relationshipsByType[type]) {
          relationshipsByType[type] = [];
        }
        
        // Find node labels
        const startNode = nodes.find(n => n.elementId === rel.startNodeElementId);
        const endNode = nodes.find(n => n.elementId === rel.endNodeElementId);
        
        relationshipsByType[type].push({
          start: startNode ? startNode.labels[0] : 'Unknown',
          end: endNode ? endNode.labels[0] : 'Unknown'
        });
      });
      
      // Sort by relationship type
      const sortedTypes = Object.keys(relationshipsByType).sort();
      
      sortedTypes.forEach((type, index) => {
        const rels = relationshipsByType[type];
        console.log(`${index + 1}. ${type}`);
        
        // Deduplicate and show unique patterns
        const patterns = new Set();
        rels.forEach(rel => {
          patterns.add(`(${rel.start})-[:${type}]->(${rel.end})`);
        });
        
        patterns.forEach(pattern => {
          console.log(`   ${pattern}`);
        });
        
        console.log('');
      });
      
      console.log('='.repeat(80));
      console.log(`Summary: ${nodes.length} node types, ${sortedTypes.length} relationship types`);
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('Error querying schema:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the query
querySchema().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
