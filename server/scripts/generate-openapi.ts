#!/usr/bin/env node
/**
 * Generate static OpenAPI specification file
 * 
 * This script generates the public/openapi.json file from JSDoc annotations
 * in API endpoint files. Run this after adding or modifying API documentation.
 * 
 * Usage:
 *   npm run docs:api
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'

async function generateOpenAPI() {
  try {
    console.log('🔄 Generating OpenAPI specification...')
    
    // Import the OpenAPI spec
    const { openapiSpec } = await import('../openapi.js')
    
    // Write to public directory
    const outputPath = resolve(process.cwd(), 'public/openapi.json')
    writeFileSync(outputPath, JSON.stringify(openapiSpec, null, 2))
    
    console.log('✅ OpenAPI specification generated successfully')
    console.log(`📄 Output: ${outputPath}`)
    console.log('\nYou can now view the documentation at:')
    console.log('  - http://localhost:3000/api-reference (integrated)')
    console.log('  - http://localhost:3000/api-docs.html (standalone)')
    console.log('  - http://localhost:3000/openapi.json (raw spec)')
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI specification:', error)
    process.exit(1)
  }
}

generateOpenAPI()
