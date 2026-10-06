import CommunityCoverEditor from '../../components/CommunityCoverEditor'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createCommunityPost, createPostComment, deleteCommunityPost, getCommunity,
  listCommunityMembers, listCommunityPosts, listPostComments, removeCommunityMember,
  updateCommunity, type CommunityComment, type CommunityMember, type CommunityPost,
  type CommunitySummary,
} from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './DirectorCommunityDetailPage.css'

type IconName = 'community' | 'person' | 'post' | 'edit' | 'trash' | 'close' | 'check' | 'refresh'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    person: <><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
    post: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6" /></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="director-detail-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT' }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '') }

export default function DirectorCommunityDetailPage() {
  const { comunidadeId } = useParams()
  const id = Number(comunidadeId)
  const { token, user, clearSession } = useAuth()
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  const [community, setCommunity] = useState<CommunitySummary | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<Record<number, CommunityComment[]>>({})
  const [newPost, setNewPost] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRules, setEditRules] = useState('')
  const [editCover, setEditCover] = useState('')
  const [coverBusy, setCoverBusy] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token || !Number.isInteger(id) || id <= 0) {
      setErrorMessage('O endereço desta comunidade é inválido'); setLoading(false); return
    }
    setLoading(true); setErrorMessage('')
    try {
      const [communityData, memberData, postData] = await Promise.all([
        getCommunity(id, token, signal), listCommunityMembers(id, token, signal), listCommunityPosts(id, token, signal),
      ])
      const commentEntries = await Promise.all(postData.map(async (post) => [post.id, await listPostComments(id, post.id, token, signal)] as const))
      setCommunity(communityData); setMembers(memberData); setPosts(postData); setComments(Object.fromEntries(commentEntries))
      setEditName(communityData.nome); setEditDescription(communityData.descricao); setEditRules(communityData.regras || ''); setEditCover(communityData.capa || '')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a comunidade'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, id, token])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  async function saveCommunity(event: FormEvent) {
    event.preventDefault()
    if (!token || !community || busy || coverBusy) return
    setBusy('edit'); setErrorMessage('')
    try {
      const updated = await updateCommunity(id, { nome: editName.trim(), descricao: editDescription.trim(), regras: editRules.trim(), capa: editCover }, token)
      setCommunity({ ...community, ...updated, creatorName: community.creatorName })
      setEditing(false); setNotice('Informações da comunidade atualizadas.')
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível atualizar') }
    finally { setBusy(null) }
  }

  async function publish(event: FormEvent) {
    event.preventDefault()
    const content = newPost.trim()
    if (!token || !user || !content || busy) return
    setBusy('post')
    try {
      const created = await createCommunityPost(id, content, token)
      setPosts((current) => [{ ...created, authorName: user.nome }, ...current]); setComments((current) => ({ ...current, [created.id]: [] })); setNewPost('')
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível publicar') }
    finally { setBusy(null) }
  }

  async function comment(event: FormEvent, postId: number) {
    event.preventDefault()
    const content = commentDrafts[postId]?.trim()
    if (!token || !user || !content || busy) return
    setBusy(`comment-${postId}`)
    try {
      const created = await createPostComment(id, postId, content, token)
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), { ...created, authorName: user.nome }] }))
      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível comentar') }
    finally { setBusy(null) }
  }

  async function removeMember(member: CommunityMember) {
    if (!token || busy || !window.confirm(`Remover ${member.nome} desta comunidade?`)) return
    setBusy(`member-${member.id}`)
    try { await removeCommunityMember(id, member.id, token); setMembers((current) => current.filter((item) => item.id !== member.id)); setNotice(`${member.nome} foi removido.`) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível remover') }
    finally { setBusy(null) }
  }

  async function removePost(post: CommunityPost) {
    if (!token || busy || !window.confirm('Excluir esta publicação e seus comentários?')) return
    setBusy(`post-${post.id}`)
    try { await deleteCommunityPost(id, post.id, token); setPosts((current) => current.filter((item) => item.id !== post.id)); setNotice('Publicação excluída.') }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir') }
    finally { setBusy(null) }
  }

  if (loading) return <main className="director-detail-feedback" aria-live="polite"><span /><p>Carregando comunidade...</p></main>
  if (errorMessage && !community) return <main className="director-detail-feedback"><h1>Não foi possível abrir a comunidade</h1><p>{errorMessage}</p><Link to={`${base}/comunidades`}>Voltar</Link></main>
  if (!community) return null
  const rules = community.regras?.split(/\n+/).filter(Boolean) ?? []
  const canManage = user?.role === 'DIRECAO' || community.creatorId === user?.id

  return (
    <main className="director-community-detail">
      <nav><Link to={`${base}/comunidades`}>Comunidades</Link><span>/</span><span>{community.nome}</span></nav>
      {community.capa ? <img className="community-detail-cover" src={community.capa} alt="" /> : null}
      <header>
        <span><Icon name="community" /></span>
        <div><h1>{community.nome}</h1><p>{community.descricao}</p><small>Por {community.creatorName} · {members.length} participantes · {posts.length} publicações</small></div>
        {canManage ? <button type="button" onClick={() => setEditing(true)}><Icon name="edit" /> Editar comunidade</button> : null}
      </header>

      {notice ? <p className="director-detail-notice" role="status">{notice}</p> : null}
      {errorMessage ? <p className="director-detail-error" role="alert">{errorMessage}</p> : null}

      <div className="director-detail-layout">
        <section className="director-detail-feed">
          <form className="director-detail-composer" onSubmit={publish}><span>{initials(user?.nome ?? '')}</span><textarea value={newPost} onChange={(event) => setNewPost(event.target.value)} maxLength={10000} placeholder="Compartilhe uma atualização com a comunidade..." /><button type="submit" disabled={!newPost.trim() || Boolean(busy)}>{busy === 'post' ? 'Publicando...' : 'Publicar'}</button></form>
          {posts.map((post) => (
            <article className="director-detail-post" key={post.id}>
              <header><span>{initials(post.authorName || 'CT')}</span><div><strong>{post.authorName || 'Participante'}</strong><time>{formatDate(post.createdAt)}</time></div>{canManage || post.authorId === user?.id ? <button type="button" onClick={() => void removePost(post)} disabled={Boolean(busy)} aria-label="Excluir publicação"><Icon name="trash" /></button> : null}</header>
              <p>{post.conteudo}</p>
              {(comments[post.id] ?? []).length ? <div className="director-detail-comments">{(comments[post.id] ?? []).map((item) => <div key={item.id}><span>{initials(item.authorName || 'CT')}</span><p><strong>{item.authorName || 'Participante'}</strong><time>{formatDate(item.createdAt)}</time><em>{item.conteudo}</em></p></div>)}</div> : null}
              <form onSubmit={(event) => void comment(event, post.id)}><input value={commentDrafts[post.id] ?? ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={10000} placeholder="Escreva um comentário..." /><button type="submit" disabled={!commentDrafts[post.id]?.trim() || Boolean(busy)}>Comentar</button></form>
            </article>
          ))}
          {!posts.length ? <div className="director-detail-empty"><Icon name="post" /><h2>Nenhuma publicação</h2><p>Use o campo acima para iniciar a comunidade.</p></div> : null}
        </section>

        <aside>
          <section><h2>Regras de convivência</h2>{rules.length ? <ol>{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol> : <p>Nenhuma regra específica cadastrada.</p>}</section>
          <section><h2>Participantes ({members.length})</h2><div className="director-detail-members">{members.map((member) => <article key={member.id}><span>{initials(member.nome)}</span><div><strong>{member.nome}</strong><small>{member.role}</small></div>{member.id === community.creatorId ? <i>Criador</i> : canManage ? <button type="button" onClick={() => void removeMember(member)} disabled={Boolean(busy)} aria-label={`Remover ${member.nome}`}><Icon name="close" /></button> : null}</article>)}</div></section>
        </aside>
      </div>

      {editing ? <div className="director-detail-modal" role="dialog" aria-modal="true" aria-labelledby="edit-community-title"><form onSubmit={saveCommunity}><header><h2 id="edit-community-title">Editar comunidade</h2><button type="button" onClick={() => { setEditing(false); setCoverBusy(false); setEditCover(community.capa || '') }} aria-label="Fechar"><Icon name="close" /></button></header><label>Nome<input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required /></label><label>Descrição<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={2000} required /></label><label>Regras<textarea value={editRules} onChange={(event) => setEditRules(event.target.value)} maxLength={5000} /></label><CommunityCoverEditor value={editCover} onChange={setEditCover} onBusyChange={setCoverBusy} /><footer><button type="button" onClick={() => { setEditing(false); setCoverBusy(false); setEditCover(community.capa || '') }}>Cancelar</button><button type="submit" disabled={busy === 'edit' || coverBusy}><Icon name="check" /> {busy === 'edit' ? 'Salvando...' : 'Salvar alterações'}</button></footer></form></div> : null}
    </main>
  )
}
