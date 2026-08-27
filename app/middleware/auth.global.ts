export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser()
    if (!user.value && to.path !== '/login') {
        return navigateTo('/login')
    }
    if (user.value && to.path === '/login') {
        return navigateTo('/')
    }
})