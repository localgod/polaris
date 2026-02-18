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

  return { isSuperuser }
}
