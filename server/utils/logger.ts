import pino from 'pino'

/**
 * Base structured logger for server-side code.
 *
 * Level is controlled at runtime via the LOG_LEVEL environment variable
 * (default: "info"). Set LOG_LEVEL=debug for verbose output during incident
 * investigation without a redeploy.
 *
 * Output is newline-delimited JSON on stdout, compatible with Docker log
 * drivers and Dozzle. The `formatters.level` option emits string level names
 * ("info", "warn", "error") instead of numeric codes so Dozzle can apply
 * level-based colour coding and filtering.
 *
 * In test environments (NODE_ENV=test) logging is silenced to keep test
 * output clean.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  formatters: {
    level: (label) => ({ level: label }),
  },
})
