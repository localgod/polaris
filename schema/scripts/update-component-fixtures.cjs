#!/usr/bin/env node

/**
 * Script to update component fixtures to new SBOM schema
 * Converts old schema (single hash, single license, importPath) to new schema
 * (purl, hashes array, licenses array, SBOM metadata)
 */

const fs = require('fs');
const path = require('path');

const fixtureFile = path.join(__dirname, '../fixtures/tech-catalog.json');

// Read fixture data
const data = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));

// Component metadata mapping (real-world data)
const componentMetadata = {
  'react': {
    supplier: 'Meta Platforms, Inc.',
    author: 'Meta Platforms, Inc.',
    publisher: 'npm',
    description: 'React is a JavaScript library for building user interfaces.',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    homepage: 'https://reactjs.org/',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2022-06-14T00:00:00Z'
  },
  'react-dom': {
    supplier: 'Meta Platforms, Inc.',
    author: 'Meta Platforms, Inc.',
    publisher: 'npm',
    description: 'React package for working with the DOM.',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    homepage: 'https://reactjs.org/',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2022-06-14T00:00:00Z'
  },
  'vue': {
    supplier: 'Evan You',
    author: 'Evan You',
    publisher: 'npm',
    description: 'The progressive JavaScript framework for building modern web UI.',
    copyright: 'Copyright (c) 2013-present, Yuxi (Evan) You',
    homepage: 'https://vuejs.org/',
    type: 'framework',
    group: null,
    scope: 'required',
    releaseDate: '2023-07-28T00:00:00Z'
  },
  'express': {
    supplier: 'OpenJS Foundation',
    author: 'TJ Holowaychuk',
    publisher: 'npm',
    description: 'Fast, unopinionated, minimalist web framework for Node.js',
    copyright: 'Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>',
    homepage: 'https://expressjs.com/',
    type: 'framework',
    group: null,
    scope: 'required',
    releaseDate: '2022-10-08T00:00:00Z'
  },
  'typescript': {
    supplier: 'Microsoft Corporation',
    author: 'Microsoft Corporation',
    publisher: 'npm',
    description: 'TypeScript is a language for application scale JavaScript development',
    copyright: 'Copyright (c) Microsoft Corporation. All rights reserved.',
    homepage: 'https://www.typescriptlang.org/',
    type: 'library',
    group: null,
    scope: 'dev',
    releaseDate: '2023-12-11T00:00:00Z'
  },
  'neo4j-driver': {
    supplier: 'Neo4j, Inc.',
    author: 'Neo4j, Inc.',
    publisher: 'npm',
    description: 'Official Neo4j driver for JavaScript',
    copyright: 'Copyright (c) 2002-2024 "Neo4j,"',
    homepage: 'https://neo4j.com/',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2023-11-15T00:00:00Z'
  },
  'pg': {
    supplier: 'Brian Carlson',
    author: 'Brian Carlson',
    publisher: 'npm',
    description: 'PostgreSQL client for Node.js - pure JavaScript and native libpq bindings',
    copyright: 'Copyright (c) 2010-2023 Brian Carlson',
    homepage: 'https://node-postgres.com/',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2023-09-14T00:00:00Z'
  },
  'loose-envify': {
    supplier: 'Andres Suarez',
    author: 'Andres Suarez',
    publisher: 'npm',
    description: 'Fast (and loose) selective `process.env` replacer using js-tokens instead of an AST',
    copyright: 'Copyright (c) 2015 Andres Suarez <zertosh@gmail.com>',
    homepage: 'https://github.com/zertosh/loose-envify',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2015-11-02T00:00:00Z'
  },
  'js-tokens': {
    supplier: 'Simon Lydell',
    author: 'Simon Lydell',
    publisher: 'npm',
    description: 'A regex that tokenizes JavaScript.',
    copyright: 'Copyright (c) 2014, 2015, 2016, 2017, 2018 Simon Lydell',
    homepage: 'https://github.com/lydell/js-tokens',
    type: 'library',
    group: null,
    scope: 'required',
    releaseDate: '2018-01-28T00:00:00Z'
  }
};

// Convert old component to new SBOM schema
function convertComponent(oldComponent) {
  const metadata = componentMetadata[oldComponent.name] || {};
  
  // Generate purl (Package URL)
  const purl = `pkg:${oldComponent.packageManager}/${oldComponent.name}@${oldComponent.version}`;
  
  // Generate CPE (Common Platform Enumeration) - simplified format
  const vendor = metadata.supplier ? metadata.supplier.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'unknown';
  const cpe = `cpe:2.3:a:${vendor}:${oldComponent.name}:${oldComponent.version}:*:*:*:*:*:*:*`;
  
  // Convert single hash to hashes array
  const hashes = [];
  if (oldComponent.hash) {
    const [algorithm, value] = oldComponent.hash.split(':');
    hashes.push({
      algorithm: algorithm.toUpperCase().replace('SHA', 'SHA-'),
      value: value
    });
    
    // Add SHA-512 hash (simulated for demo)
    hashes.push({
      algorithm: 'SHA-512',
      value: value + value.substring(0, 64) // Simulate longer hash
    });
  }
  
  // Convert single license to licenses array
  const licenses = [];
  if (oldComponent.license) {
    licenses.push({
      id: oldComponent.license,
      name: oldComponent.license === 'MIT' ? 'MIT License' : 
            oldComponent.license === 'Apache-2.0' ? 'Apache License 2.0' : 
            oldComponent.license,
      url: oldComponent.license === 'MIT' ? 'https://opensource.org/licenses/MIT' :
           oldComponent.license === 'Apache-2.0' ? 'https://www.apache.org/licenses/LICENSE-2.0' :
           null,
      text: null
    });
  }
  
  // Create external references
  const externalReferences = [];
  if (oldComponent.sourceRepo) {
    externalReferences.push({
      type: 'vcs',
      url: oldComponent.sourceRepo
    });
  }
  if (metadata.homepage) {
    externalReferences.push({
      type: 'website',
      url: metadata.homepage
    });
  }
  if (oldComponent.sourceRepo) {
    externalReferences.push({
      type: 'issue-tracker',
      url: oldComponent.sourceRepo + '/issues'
    });
  }
  
  // Build new component
  return {
    // Core identification
    name: oldComponent.name,
    version: oldComponent.version,
    packageManager: oldComponent.packageManager,
    
    // Universal identifiers
    purl: purl,
    cpe: cpe,
    bomRef: purl,
    
    // Classification
    type: metadata.type || 'library',
    group: metadata.group || null,
    scope: metadata.scope || 'required',
    
    // Hashes
    hashes: hashes,
    
    // Licenses
    licenses: licenses,
    copyright: metadata.copyright || null,
    
    // Supplier/Author
    supplier: metadata.supplier || null,
    author: metadata.author || null,
    publisher: metadata.publisher || null,
    
    // Metadata
    description: metadata.description || null,
    homepage: metadata.homepage || null,
    
    // External references
    externalReferences: externalReferences,
    
    // Temporal
    releaseDate: metadata.releaseDate || null,
    publishedDate: metadata.releaseDate || null,
    modifiedDate: null
  };
}

// Update components
console.log('Updating component fixtures to new SBOM schema...');
console.log(`Found ${data.components.length} components to update`);

data.components = data.components.map(component => {
  console.log(`  - Converting ${component.name}@${component.version}`);
  return convertComponent(component);
});

// Write updated fixture data
fs.writeFileSync(fixtureFile, JSON.stringify(data, null, 2) + '\n');

console.log('✅ Component fixtures updated successfully!');
console.log(`Updated ${data.components.length} components with new SBOM schema`);
