const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function changePassword(token: string, senhaAtual: string, novaSenha: string) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('Senha atual incorreta ou sessão expirada')
    if (response.status === 429) throw new Error('Muitas tentativas. Aguarde um pouco e tente novamente')
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    throw new Error(message || 'Não foi possível alterar a senha')
  }
}


export async function resetPassword(token: string, novaSenha: string) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, novaSenha }),
  })
  if (!response.ok) {
    if (response.status === 400) throw new Error('Código inválido ou expirado')
    if (response.status === 429) throw new Error('Muitas tentativas. Aguarde um minuto')
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    throw new Error(message || 'Não foi possível redefinir a senha')
  }
}

export async function saveProfilePhoto(token: string, foto: string, original?: string) {
 const response = await fetch(`${API_URL}/auth/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ foto, original }) })
 if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou' : 'Não foi possível salvar a foto. Tente novamente.')
 return response.json() as Promise<{ foto: string | null }>
}

export async function getProfilePhoto(token: string) {
 const response = await fetch(`${API_URL}/auth/photo`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
 if (!response.ok) throw new Error('Não foi possível carregar a foto original.');
 return response.json() as Promise<{original:string|null}>;
}
