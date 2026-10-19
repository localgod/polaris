import * as z from 'zod'

// Mirrors WaiverService.create: a reason, and an expiry strictly in the future
export const waiverSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required'),
  expiresAt: z.string()
    .min(1, 'Expiry date is required — waivers cannot be indefinite')
    .refine(value => new Date(value).getTime() > Date.now(), 'Expiry date must be in the future')
})
