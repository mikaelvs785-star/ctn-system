import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { AuthStatus, AuthUser, UserRole } from './auth.types'
import { normalizeCpf } from '../utils/cpf'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'ctn:access-token'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const KNOWN_ROLES: UserRole[] = ['ALUNO', 'PROFESSOR', 'DIRECAO', 'COORDENACAO', 'SOE']

interface AuthProviderProps { children: ReactNode }
interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}
interface ApiError { message?: string | string[] }

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<AuthUser>
  return typeof user.id === 'number' &&
    typeof user.nome === 'string' &&
    (typeof user.email === 'string' || user.email === null) &&
    typeof user.role === 'string' &&
    KNOWN_ROLES.includes(user.role as UserRole)
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<LoginResponse>
  return typeof session.access_token === 'string' &&
    TOKEN_PATTERN.test(session.access_token) &&
    session.token_type === 'Bearer' &&
    typeof session.expires_in === 'number' &&
    isAuthUser(session.user)
}

async function getErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as ApiError
    if (Array.isArray(body.message)) return body.message.join('. ')
    if (body.message) return body.message
  } catch {}
  if (response.status === 401) return 'CPF ou senha inválidos'
  if (response.status === 429) return 'Muitas tentativas. Aguarde um minuto'
  return 'Não foi possível entrar. Tente novamente'
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const establishSession = useCallback((newToken: string, authenticatedUser: AuthUser) => {
    sessionStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(authenticatedUser)
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const trimmed = identifier.trim()
    const body = trimmed.includes('@')
      ? { email: trimmed.toLowerCase(), senha: password }
      : { cpf: normalizeCpf(trimmed), senha: password }

    let response: Response
    try {
      response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão')
    }
    if (!response.ok) throw new Error(await getErrorMessage(response))
    const session: unknown = await response.json()
    if (!isLoginResponse(session)) throw new Error('O servidor retornou uma sessão inválida')
    establishSession(session.access_token, session.user)
    return session.user
  }, [establishSession])

  const logout = useCallback(async () => {
    const currentToken = token
    clearSession()
    if (!currentToken) return
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      })
    } catch {}
  }, [clearSession, token])

  useEffect(() => {
    if (!token) {
      setStatus('unauthenticated')
      return
    }
    const controller = new AbortController()
    async function validateSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) return clearSession()
        const authenticatedUser: unknown = await response.json()
        if (!isAuthUser(authenticatedUser)) return clearSession()
        setUser(authenticatedUser)
        setStatus('authenticated')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        clearSession()
      }
    }
    void validateSession()
    return () => controller.abort()
  }, [clearSession, token])

  const updatePhoto = useCallback((foto: string | null) => {
    setUser(current => current ? { ...current, foto } : current)
  }, [])

  const value = useMemo(
    () => ({ status, user, token, login, logout, clearSession, updatePhoto }),
    [clearSession, login, logout, status, token, user, updatePhoto],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
