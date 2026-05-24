import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '~/pages/index.vue'
import LoginPage from '~/pages/login.vue'
import SignupPage from '~/pages/signup.vue'
import ForgotPasswordPage from '~/pages/forgot-password.vue'
import ResetPasswordPage from '~/pages/reset-password.vue'
import FeatureFlags from '~/pages/ffc.vue'
import RoomPage from '~/pages/[slug].vue'

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomePage, meta: { title: 'Home' } },
  { path: '/login', component: LoginPage, meta: { title: 'Sign in' } },
  { path: '/signup', component: SignupPage, meta: { title: 'Sign up' } },
  { path: '/forgot-password', component: ForgotPasswordPage, meta: { title: 'Forgot password' } },
  { path: '/reset-password', component: ResetPasswordPage, meta: { title: 'Reset password' } },
  { path: '/ffc', component: FeatureFlags, meta: { title: 'Feature flags' } },
  { path: '/:slug', component: RoomPage },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} | Story Poker` : 'Story Poker'
})
