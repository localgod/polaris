export default defineNuxtRouteMiddleware((to) => {
  const { status } = useAuth()

  if (status.value !== 'authenticated') {
    return navigateTo({ path: '/auth/signin', query: { callbackUrl: to.fullPath } })
  }
})
