const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface CommunitySummary {
  id: number
  nome: string
  descricao: string
  capa?: string | null
  regras: string
  creatorId: number
  creatorName: string
  participating: boolean
  memberCount: number
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface CommunityMember {
  id: number
  nome: string
  role: string
  createdAt: string
}

export interface CommunityPost {
  id: number
  conteudo: string
  communityId: number
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface CommunityComment {
  id: number
  conteudo: string
  postId: number
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

function asNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function isCommunity(value: unknown): value is CommunitySummary {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CommunitySummary>
  return typeof item.id === 'number' && typeof item.nome === 'string' && typeof item.descricao === 'string'
}

function isPost(value: unknown): value is CommunityPost {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CommunityPost>
  return typeof item.id === 'number' && typeof item.conteudo === 'string' && typeof item.authorId === 'number'
}

function isComment(value: unknown): value is CommunityComment {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CommunityComment>
  return typeof item.id === 'number' && typeof item.conteudo === 'string' && typeof item.authorId === 'number'
}

async function request(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    if (response.status === 403) throw new Error('Você precisa participar desta comunidade para acessar o conteúdo')
    if (response.status === 404) throw new Error('Comunidade não encontrada')
    const data = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(data?.message || 'Não foi possível concluir a ação')
  }

  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export async function listCommunities(token: string, signal?: AbortSignal) {
  const data = await request('/communities?page=1&limit=100', token, { signal })
  if (!Array.isArray(data)) throw new Error('As comunidades retornaram dados inválidos')
  return data.filter(isCommunity).map((item) => ({
    ...item,
    creatorName: item.creatorName || 'Equipe CEMTN',
    participating: Boolean(item.participating),
    memberCount: asNumber(item.memberCount),
    postCount: asNumber(item.postCount),
  }))
}

export async function getCommunity(id: number, token: string, signal?: AbortSignal) {
  const data = await request(`/communities/${id}`, token, { signal })
  if (!isCommunity(data)) throw new Error('A comunidade retornou dados inválidos')
  return {
    ...data,
    creatorName: data.creatorName || 'Equipe CEMTN',
    participating: true,
    memberCount: asNumber(data.memberCount),
    postCount: asNumber(data.postCount),
  }
}

export async function listCommunityMembers(id: number, token: string, signal?: AbortSignal) {
  const data = await request(`/communities/${id}/members?page=1&limit=100`, token, { signal })
  if (!Array.isArray(data)) throw new Error('Os participantes retornaram dados inválidos')
  return data.filter((item): item is CommunityMember => {
    if (!item || typeof item !== 'object') return false
    const member = item as Partial<CommunityMember>
    return typeof member.id === 'number' && typeof member.nome === 'string'
  })
}

export async function listCommunityPosts(id: number, token: string, signal?: AbortSignal) {
  const data = await request(`/communities/${id}/posts?page=1&limit=100`, token, { signal })
  if (!Array.isArray(data)) throw new Error('As publicações retornaram dados inválidos')
  return data.filter(isPost)
}

export async function listPostComments(communityId: number, postId: number, token: string, signal?: AbortSignal) {
  const data = await request(`/communities/${communityId}/posts/${postId}/comments?page=1&limit=100`, token, { signal })
  if (!Array.isArray(data)) throw new Error('Os comentários retornaram dados inválidos')
  return data.filter(isComment)
}

export async function createCommunityPost(communityId: number, conteudo: string, token: string) {
  const data = await request(`/communities/${communityId}/posts`, token, {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  })
  if (!isPost(data)) throw new Error('A publicação retornou dados inválidos')
  return data
}

export async function createPostComment(communityId: number, postId: number, conteudo: string, token: string) {
  const data = await request(`/communities/${communityId}/posts/${postId}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  })
  if (!isComment(data)) throw new Error('O comentário retornou dados inválidos')
  return data
}

export async function joinCommunity(id: number, token: string) {
  await request(`/communities/${id}/members/me`, token, { method: 'POST' })
}

export async function deleteCommunity(id: number, token: string) {
  await request(`/communities/${id}`, token, { method: 'DELETE' })
}

export async function createCommunity(input: { nome: string; descricao: string; regras: string; capa?: string }, token: string) {
  const data = await request('/communities', token, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!isCommunity(data)) throw new Error('A comunidade retornou dados inválidos')
  return data
}

export async function updateCommunity(id: number, input: { nome: string; descricao: string; regras: string; capa?: string }, token: string) {
  const data = await request(`/communities/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  if (!isCommunity(data)) throw new Error('A comunidade retornou dados inválidos')
  return data
}

export async function removeCommunityMember(communityId: number, userId: number, token: string) {
  await request(`/communities/${communityId}/members/${userId}`, token, { method: 'DELETE' })
}

export async function deleteCommunityPost(communityId: number, postId: number, token: string) {
  await request(`/communities/${communityId}/posts/${postId}`, token, { method: 'DELETE' })
}
