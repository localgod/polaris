export type BadgeColor = 'success' | 'warning' | 'error' | 'neutral'

const CRITICALITY_COLORS: Record<string, BadgeColor> = {
  critical: 'error',
  high: 'warning',
  medium: 'success',
  low: 'neutral'
}

export function getCriticalityColor(value: string | null | undefined): BadgeColor {
  return CRITICALITY_COLORS[value?.toLowerCase() ?? ''] ?? 'neutral'
}

const SEVERITY_COLORS: Record<string, BadgeColor> = {
  critical: 'error',
  error: 'error',
  warning: 'warning',
  info: 'neutral'
}

export function getSeverityColor(value: string | null | undefined): BadgeColor {
  return SEVERITY_COLORS[value?.toLowerCase() ?? ''] ?? 'neutral'
}

const CATEGORY_COLORS: Record<string, BadgeColor> = {
  permissive: 'success',
  'weak-copyleft': 'warning',
  copyleft: 'warning',
  'strong-copyleft': 'error',
  proprietary: 'error',
  'public-domain': 'success'
}

export function getCategoryColor(value: string | null | undefined): BadgeColor {
  return CATEGORY_COLORS[value?.toLowerCase() ?? ''] ?? 'neutral'
}

const ENVIRONMENT_COLORS: Record<string, BadgeColor> = {
  prod: 'error',
  staging: 'warning',
  test: 'neutral',
  dev: 'neutral'
}

export function getEnvironmentColor(value: string | null | undefined): BadgeColor {
  return ENVIRONMENT_COLORS[value?.toLowerCase() ?? ''] ?? 'neutral'
}

const TIME_CATEGORY_COLORS: Record<string, BadgeColor> = {
  invest: 'success',
  tolerate: 'warning',
  migrate: 'warning',
  eliminate: 'error'
}

export function getTimeCategoryColor(value: string | null | undefined): BadgeColor {
  return TIME_CATEGORY_COLORS[value?.toLowerCase() ?? ''] ?? 'neutral'
}
