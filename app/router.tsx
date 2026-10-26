import { useEffect, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import HomePage from '~/pages/index'
import LoginPage from '~/pages/login'
import SignupPage from '~/pages/signup'
import ForgotPasswordPage from '~/pages/forgot-password'
import ResetPasswordPage from '~/pages/reset-password'
import FeatureFlagsPage from '~/pages/ffc'
import RoomPage from '~/pages/[slug]'

function Titled({ title, children }: { title?: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title ? `${title} | Story Poker` : 'Story Poker'
  }, [title])
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Titled title="Home"><HomePage /></Titled>} />
      <Route path="/login" element={<Titled title="Sign in"><LoginPage /></Titled>} />
      <Route path="/signup" element={<Titled title="Sign up"><SignupPage /></Titled>} />
      <Route path="/forgot-password" element={<Titled title="Forgot password"><ForgotPasswordPage /></Titled>} />
      <Route path="/reset-password" element={<Titled title="Reset password"><ResetPasswordPage /></Titled>} />
      <Route path="/ffc" element={<Titled title="Feature flags"><FeatureFlagsPage /></Titled>} />
      <Route path="/:slug" element={<RoomPage />} />
    </Routes>
  )
}
