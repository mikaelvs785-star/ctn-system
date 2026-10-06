const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type CreateUserRole = 'PROFESSOR' | 'DIRECAO'
export type ManagedUserRole = 'ALUNO' | CreateUserRole

export interface SystemUser {
  id: number
  hasFoto?: boolean
  nome: string
  email: string | null
  cpfMascarado: string | null
  ativo: boolean
  statusCadastro: 'PENDENTE' | 'ATIVO' | 'RECUSADO' | 'DESATIVADO'
  roleId: number
  role: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  nome: string
  email: string
  cpf: string
  senha: string
  role: CreateUserRole
}

function isSystemUser(value: unknown): value is SystemUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<SystemUser>
  return typeof user.id === 'number' && typeof user.nome === 'string' && (typeof user.email === 'string' || user.email === null) && typeof user.ativo === 'boolean' && typeof user.statusCadastro === 'string' && typeof user.role === 'string'
}

async function readResponse(response: Response, fallback: string) {
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    if (response.status === 403) throw new Error('Apenas a Direção pode acessar os usuários')
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    throw new Error(message || fallback)
  }
  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export async function listUsers(token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/users?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` }, signal })
  const data = await readResponse(response, 'Não foi possível carregar os usuários')
  if (!Array.isArray(data)) throw new Error('Os usuários retornaram dados inválidos')
  return data.filter(isSystemUser)
}

export async function createUser(input: CreateUserInput, token: string) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível cadastrar o usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}

export async function updateUserStatus(id: number, ativo: boolean, token: string) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo }),
  })
  const data = await readResponse(response, 'Não foi possível alterar a situação do usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}

export interface UpdateUserInput {
  nome?: string
  email?: string
  cpf?: string
  role?: ManagedUserRole
}

export async function getUser(id: number, token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  const data = await readResponse(response, 'Não foi possível carregar o usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}

export async function updateUser(id: number, input: UpdateUserInput, token: string) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível atualizar o usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}


export async function issuePasswordReset(id: number, token: string) {
  const response = await fetch(`${API_URL}/users/${id}/password-reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readResponse(response, 'Não foi possível gerar o código de recuperação')
  if (!data || typeof data !== 'object') throw new Error('O servidor retornou um código inválido')
  const reset = data as { token?: unknown; expires_in?: unknown }
  if (typeof reset.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(reset.token) || typeof reset.expires_in !== 'number') {
    throw new Error('O servidor retornou um código inválido')
  }
  return { token: reset.token, expiresIn: reset.expires_in }
}


export async function updateUserRegistrationStatus(
  id: number,
  acao: 'APROVAR' | 'RECUSAR' | 'DESATIVAR' | 'REATIVAR',
  token: string,
) {
  const response = await fetch(`${API_URL}/users/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao }),
  })
  const data = await readResponse(response, 'Não foi possível alterar o status do usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}

export async function getUserPhoto(id: number, token: string, signal?: AbortSignal) {
 const response = await fetch(`${API_URL}/users/${id}/photo`, {headers:{Authorization:`Bearer ${token}`},signal,cache:'no-store'});
 return await readResponse(response,'Não foi possível carregar a foto') as {foto:string|null;original:string|null};
}
