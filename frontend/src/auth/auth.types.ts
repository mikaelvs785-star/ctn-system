export type UserRole =
  | 'ALUNO'
  | 'PROFESSOR'
  | 'DIRECAO'
  | 'COORDENACAO'
  | 'SOE'

export interface AuthUser {
  id: number
  nome: string
  cpfMascarado?: string
  email: string | null
  role: UserRole
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
