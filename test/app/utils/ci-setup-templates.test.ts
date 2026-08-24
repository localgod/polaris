import { describe, it, expect } from 'vitest'
import { buildGithubActionsWorkflow, buildCustomCiSnippet } from '../../../app/utils/ci-setup-templates'

describe('[pin] buildGithubActionsWorkflow()', () => {
  it('fills in the system name and references secrets rather than a raw token', () => {
    const yaml = buildGithubActionsWorkflow({ systemName: 'polaris' })

    expect(yaml).toContain("POLARIS_SYSTEM: 'polaris'")
    expect(yaml).toContain('POLARIS_URL: ${{ secrets.POLARIS_URL }}')
    expect(yaml).toContain('POLARIS_TOKEN: ${{ secrets.POLARIS_TOKEN }}')
    expect(yaml).not.toContain('your-generated-token')
  })

  it('pins POLARIS_REPO_URL when a repo is provided, and comments it out otherwise', () => {
    const withRepo = buildGithubActionsWorkflow({ systemName: 'polaris', repoUrl: 'https://github.com/org/repo' })
    const withoutRepo = buildGithubActionsWorkflow({ systemName: 'polaris' })

    expect(withRepo).toContain("POLARIS_REPO_URL: 'https://github.com/org/repo'")
    expect(withoutRepo).toContain("# POLARIS_REPO_URL: 'https://github.com/my-org/my-repo'")
  })
})

describe('[pin] buildCustomCiSnippet()', () => {
  it('fills in the system name, instance URL, and repo URL when provided', () => {
    const snippet = buildCustomCiSnippet({
      systemName: 'polaris',
      polarisUrl: 'https://polaris.example.com',
      repoUrl: 'https://github.com/org/repo'
    })

    expect(snippet).toContain('export POLARIS_SYSTEM="polaris"')
    expect(snippet).toContain('export POLARIS_URL="https://polaris.example.com"')
    expect(snippet).toContain('export POLARIS_REPO_URL="https://github.com/org/repo"')
    expect(snippet).toContain('node polaris-push.mjs')
  })

  it('falls back to a placeholder repo URL when none is provided', () => {
    const snippet = buildCustomCiSnippet({ systemName: 'polaris', polarisUrl: 'https://polaris.example.com' })

    expect(snippet).toContain('export POLARIS_REPO_URL="<your-repository-url>"')
  })
})
