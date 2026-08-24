export interface CiSetupParams {
  systemName: string
  polarisUrl: string
  repoUrl?: string
}

export function buildGithubActionsWorkflow({ systemName, repoUrl }: Pick<CiSetupParams, 'systemName' | 'repoUrl'>): string {
  const lines = [
    '# .github/workflows/polaris-sbom.yml',
    '#',
    '# Generates a CycloneDX SBOM using cdxgen and pushes it to Polaris on every',
    '# push to the default branch. Add the POLARIS_URL and POLARIS_TOKEN repository',
    '# secrets before committing this file (Settings → Secrets and variables → Actions).',
    '',
    'name: Polaris SBOM Push',
    '',
    'on:',
    '  push:',
    '    branches:',
    '      - main   # Change to your default branch name if different (e.g. master)',
    '',
    'permissions:',
    '  contents: read',
    '',
    'jobs:',
    '  polaris-sbom:',
    '    name: Generate and push SBOM',
    '    runs-on: ubuntu-latest',
    '',
    '    steps:',
    '      - name: Checkout',
    '        uses: actions/checkout@v7',
    '',
    '      - name: Set up Node.js',
    '        uses: actions/setup-node@v7',
    '        with:',
    "          node-version: 'lts/*'",
    "          cache: 'npm'   # Change to 'yarn' or 'pnpm' if your project uses a different package manager",
    '',
    '      - name: Install dependencies',
    '        run: npm ci',
    '',
    '      - name: Install cdxgen',
    '        run: npm install -g @cyclonedx/cdxgen',
    '',
    '      - name: Push SBOM to Polaris',
    '        continue-on-error: true   # a Polaris outage or misconfiguration must never block CI',
    '        env:',
    '          POLARIS_URL: ${{ secrets.POLARIS_URL }}',
    '          POLARIS_TOKEN: ${{ secrets.POLARIS_TOKEN }}',
    `          POLARIS_SYSTEM: '${systemName}'`,
    ...(repoUrl
      ? [`          POLARIS_REPO_URL: '${repoUrl}'`]
      : ["          # POLARIS_REPO_URL: 'https://github.com/my-org/my-repo'   # defaults to the current GitHub repo"]),
    "          POLARIS_AUTO_REGISTER: 'false'   # set 'true' to auto-link this repo to the system above",
    '',
    '          # Restrict cdxgen to specific language scanner(s) to avoid spurious components.',
    '          # Valid values: js, java, py, ruby, rust, go, php, dotnet.',
    "          POLARIS_PROJECT_TYPE: 'js'",
    '',
    '          GITHUB_SHA: ${{ github.sha }}',
    '          GITHUB_REPOSITORY: ${{ github.repository }}',
    '        run: node scripts/polaris-push.mjs',
    '        # If polaris-push.mjs is not vendored in your repo, fetch it first:',
    '        #',
    '        #   run: |',
    '        #     curl -fsSL https://raw.githubusercontent.com/localgod/polaris/main/scripts/polaris-push.mjs \\',
    '        #       -o polaris-push.mjs',
    '        #     node polaris-push.mjs',
    ''
  ]

  return lines.join('\n')
}

export function buildCustomCiSnippet({ systemName, polarisUrl, repoUrl }: CiSetupParams): string {
  const lines = [
    '# Run on every push to your default branch. Set POLARIS_URL / POLARIS_TOKEN',
    "# as protected CI variables/secrets — don't hardcode the token in your CI config.",
    `export POLARIS_URL="${polarisUrl}"`,
    ': "${POLARIS_TOKEN:?Set POLARIS_TOKEN in CI secrets}"',
    `export POLARIS_SYSTEM="${systemName}"`,
    `export POLARIS_REPO_URL="${repoUrl || '<your-repository-url>'}"`,
    '',
    'npm ci',
    'npm install -g @cyclonedx/cdxgen',
    'curl -fsSL https://raw.githubusercontent.com/localgod/polaris/main/scripts/polaris-push.mjs -o polaris-push.mjs',
    'node polaris-push.mjs'
  ]

  return lines.join('\n')
}
