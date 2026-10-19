import * as z from 'zod'

// UInput type="number" still emits a string; '' means "never expires"
const expiresInDays = z.string()
  .regex(/^(|[1-9]\d*)$/, 'Enter a whole number of days greater than zero')
  .optional()

/** Self-service tokens (`POST /api/me/tokens`) require a description. */
export const apiTokenSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  type: z.string().optional(),
  expiresInDays
})

/** Tokens issued by a superuser for a technical user — description optional. */
export const technicalUserApiTokenSchema = z.object({
  description: z.string().optional(),
  expiresInDays
})
