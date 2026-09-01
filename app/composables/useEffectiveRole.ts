/**
 * Returns the effective user role, accounting for impersonation.
 *
 * When impersonation is active, the impersonated user's role is used.
 * Otherwise, the authenticated session role is used.
 */
export function useEffectiveRole() {
  const { data: session } = useAuth()
  const { impersonation } = useImpersonation()

  const isSuperuser = computed(() => {
    if (impersonation.value.active) {
      return impersonation.value.user?.role === 'superuser'
    }
    return session.value?.user?.role === 'superuser'
  })

  // orgAdmin is always the real user's status regardless of impersonation.
  // Superusers are implicitly org-admins (matching requireOrgAdmin on the server).
  const isOrgAdmin = computed(() => {
    const role = session.value?.user?.role
    const orgAdmin = (session.value?.user as { orgAdmin?: boolean } | undefined)?.orgAdmin
    return role === 'superuser' || orgAdmin === true
  })

  return { isSuperuser, isOrgAdmin }
}
