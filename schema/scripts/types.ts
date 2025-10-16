export interface MigrationMetadata {
  filename: string
  version: string
  checksum: string
  appliedAt?: Date
  appliedBy?: string
  executionTime?: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK'
  description?: string
  dependencies?: string[]
}

export interface MigrationOptions {
  dryRun?: boolean
  environment?: 'dev' | 'prod' | 'test'
  force?: boolean
  verbose?: boolean
}

export interface MigrationResult {
  success: boolean
  applied: string[]
  failed: string[]
  skipped: string[]
  errors: Array<{ file: string; error: string }>
}
