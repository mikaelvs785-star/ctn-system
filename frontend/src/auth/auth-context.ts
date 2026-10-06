import { createContext, useContext } from 'react'
import type { AuthStatus, AuthUser } from './auth.types'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  token: string | null
  login: (identifier: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  updatePhoto: (foto: string | null) => void
  clearSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
