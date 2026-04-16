#!/usr/bin/env node
/**
 * polaris-push.mjs
 *
 * Generates a CycloneDX SBOM for the current project using cdxgen and submits
 * it to a Polaris instance via POST /api/sboms.
 *
 * Usage:
 *   node scripts/polaris-push.mjs
 *
 * Required environment variables:
 *   POLARIS_URL    - Base URL of the Polaris instance (e.g. https://polaris.example.com)
 *   POLARIS_TOKEN  - API token for a Polaris user
 *   POLARIS_SYSTEM - Name of the system in Polaris this repository belongs to
 *
 * Optional environment variables:
 *   POLARIS_REPO_URL       - Full repository URL. Defaults to https://github.com/$GITHUB_REPOSITORY
 *   POLARIS_AUTO_REGISTER  - Set to "true" to register the repo with the system before pushing
 */

import { createBom } from '@cyclonedx/cdxgen'
import { rmSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PREFIX = '[polaris-push]'

function warn(msg) {
  console.warn(`${PREFIX} WARNING: ${msg}`)
}

function info(msg) {
  console.log(`${PREFIX} ${msg}`)
}

function fatal(msg) {
  console.error(`${PREFIX} ERROR: ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POLARIS_URL = process.env.POLARIS_URL?.replace(/\/$/, '')
const POLARIS_TOKEN = process.env.POLARIS_TOKEN
const POLARIS_SYSTEM = process.env.POLARIS_SYSTEM
const POLARIS_REPO_URL =
  process.env.POLARIS_REPO_URL ||
  (process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : null)
const AUTO_REGISTER = process.env.POLARIS_AUTO_REGISTER === 'true'
// POLARIS_DOMAIN is reserved for future use when system creation is supported via this script.

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

if (!POLARIS_URL) fatal('POLARIS_URL is required.')
if (!POLARIS_TOKEN) fatal('POLARIS_TOKEN is required.')
if (!POLARIS_SYSTEM) fatal('POLARIS_SYSTEM is required.')
if (!POLARIS_REPO_URL) {
  fatal(
    'POLARIS_REPO_URL is required (or run inside a GitHub Actions workflow so GITHUB_REPOSITORY is set).'
  )
}

// ---------------------------------------------------------------------------
// SBOM generation
// ---------------------------------------------------------------------------

async function generateSbom() {
  const projectDir = process.cwd()
  const tempDir = join(projectDir, '.polaris-tmp', randomBytes(6).toString('hex'))

  info(`Generating SBOM for ${POLARIS_SYSTEM} in ${projectDir} …`)

  try {
    const bom = await createBom(projectDir, {
      installDeps: false,
      projectName: POLARIS_SYSTEM,
      projectVersion: process.env.GITHUB_SHA?.slice(0, 7) || '0.0.0',
      multiProject: true,
    })

    if (!bom) return null

    // cdxgen may return a string or an object with a bomJson property
    if (typeof bom === 'string') {
      return JSON.parse(bom)
    }
    if (bom && typeof bom === 'object' && 'bomJson' in bom) {
      return bom.bomJson
    }
    return bom
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }
}

// ---------------------------------------------------------------------------
// Polaris API calls
// ---------------------------------------------------------------------------

function polarisHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${POLARIS_TOKEN}`,
  }
}

async function registerRepository() {
  const url = `${POLARIS_URL}/api/systems/${encodeURIComponent(POLARIS_SYSTEM)}/repositories`
  info(`Registering repository ${POLARIS_REPO_URL} with system "${POLARIS_SYSTEM}" …`)

  const res = await fetch(url, {
    method: 'POST',
    headers: polarisHeaders(),
    body: JSON.stringify({ url: POLARIS_REPO_URL }),
  })

  if (res.status === 409) {
    info('Repository already registered — continuing.')
    return
  }

  if (!res.ok) {
    const body = await res.text()
    warn(`Registration failed (HTTP ${res.status}): ${body}`)
    // Non-fatal — the SBOM push will surface a clearer error if the repo is truly missing
  } else {
    info('Repository registered successfully.')
  }
}

async function pushSbom(sbom) {
  const url = `${POLARIS_URL}/api/sboms`
  info(`Pushing SBOM to ${url} …`)

  const res = await fetch(url, {
    method: 'POST',
    headers: polarisHeaders(),
    body: JSON.stringify({ repositoryUrl: POLARIS_REPO_URL, sbom }),
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    warn(
      `SBOM push failed (HTTP ${res.status}): ${body?.message || JSON.stringify(body) || 'unknown error'}`
    )
    return null
  }

  return body
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Optionally register the repository
  if (AUTO_REGISTER) {
    await registerRepository()
  }

  // 2. Generate SBOM
  let sbom
  try {
    sbom = await generateSbom()
  } catch (err) {
    warn(`SBOM generation failed: ${err.message}`)
    return
  }

  if (!sbom) {
    warn('cdxgen produced no SBOM output. Skipping push.')
    return
  }

  // Check whether cdxgen found any components
  const componentCount =
    (sbom.components?.length ?? 0) + (sbom.packages?.length ?? 0)

  if (componentCount === 0) {
    warn('No dependency manifests found — SBOM is empty. Skipping push.')
    return
  }

  info(`SBOM generated with ${componentCount} component(s).`)

  // 3. Push SBOM
  const result = await pushSbom(sbom)

  if (!result) return // warning already printed

  info(`✅ SBOM pushed successfully.`)
  info(`   System:             ${result.systemName ?? POLARIS_SYSTEM}`)
  info(`   Components added:   ${result.componentsAdded ?? 0}`)
  info(`   Components updated: ${result.componentsUpdated ?? 0}`)
}

main().catch((err) => {
  warn(`Unexpected error: ${err.message}`)
  // Exit 0 — Polaris push must never block CI
  process.exit(0)
})
