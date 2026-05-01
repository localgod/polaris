/**
 * Wire Nuxt/h3 auto-imports as globals for handler-level unit tests.
 *
 * In production these are injected by the Nuxt build. In Vitest they must
 * be set on globalThis so that handler files can reference them without
 * an explicit import.
 *
 * h3 utilities: used directly in route handlers.
 * server/utils/auth exports: Nuxt auto-imports these as globals too.
 * Stub implementations are provided here; individual tests override them
 * via vi.mock('../../../server/utils/auth').
 *
 * server/utils/auth imports '#auth' (a Nuxt alias) which is unavailable
 * in plain Vitest, so we cannot import auth.ts directly. Instead we
 * register stubs that throw by default — tests must mock them explicitly.
 */
import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus,
  createError,
  getCookie,
  getHeader,
} from 'h3'

const notMocked = (name: string) => () => {
  throw new Error(`${name} was not mocked — add vi.mock('../../../server/utils/auth') to your test`)
}

Object.assign(globalThis, {
  // h3
  defineEventHandler,
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus,
  createError,
  getCookie,
  getHeader,
  // server/utils/auth stubs (overridden per-test via vi.mock)
  requireAuth: notMocked('requireAuth'),
  requireSuperuser: notMocked('requireSuperuser'),
  requireTeamMembership: notMocked('requireTeamMembership'),
  requireAuthorization: notMocked('requireAuthorization'),
  getCurrentUser: notMocked('getCurrentUser'),
  getImpersonatorId: notMocked('getImpersonatorId'),
  canManageTeam: notMocked('canManageTeam'),
  isMemberOfTeam: notMocked('isMemberOfTeam'),
  requireTeamAccess: notMocked('requireTeamAccess'),
  getUserTeams: notMocked('getUserTeams'),
  validateTeamOwnership: notMocked('validateTeamOwnership'),
})
