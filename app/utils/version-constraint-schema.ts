import * as z from 'zod'

const versionConstraintFields = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  severity: z.string({ error: 'Severity is required' }).min(1, 'Severity is required'),
  scope: z.string({ error: 'Scope is required' }).min(1, 'Scope is required'),
  subjectTeam: z.string().optional(),
  versionRange: z.string().trim().min(1, 'Version range is required'),
  governsTechnology: z.string().optional()
})

const hasTeamForTeamScope = (data: { scope: string, subjectTeam?: string }) =>
  data.scope !== 'team' || !!data.subjectTeam
const teamScopeError = { message: 'Team is required when scope is team', path: ['subjectTeam'] }

export const versionConstraintSchema = versionConstraintFields.refine(hasTeamForTeamScope, teamScopeError)

export const versionConstraintEditSchema = versionConstraintFields
  .extend({ status: z.string({ error: 'Status is required' }).min(1, 'Status is required') })
  .refine(hasTeamForTeamScope, teamScopeError)

export type VersionConstraintForm = z.output<typeof versionConstraintSchema>
