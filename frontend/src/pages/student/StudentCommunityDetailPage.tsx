import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createCommunityPost,
  createPostComment,
  getCommunity,
  listCommunityMembers,
  listCommunityPosts,
  listPostComments,
  type CommunityComment,
  type CommunityMember,
  type CommunityPost,
  type CommunitySummary,
} from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import { prepareNewsCover } from '../../utils/news-cover'
import './StudentCommunityDetailPage.css'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value)).replace('.', '')
}

export default function StudentCommunityDetailPage() {
  const { comunidadeId } = useParams()
  const { token, user, clearSession } = useAuth()
  const id = Number(comunidadeId)
  const [community, setCommunity] = useState<CommunitySummary | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<Record<number, CommunityComment[]>>({})
  const [postImage, setPostImage] = useState('')
  const [postLink, setPostLink] = useState('')
  const [showLink, setShowLink] = useState(false)
  const [preparingImage, setPreparingImage] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    if (!Number.isInteger(id) || id <= 0) {
      setErrorMessage('O endereço desta comunidade é inválido')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    try {
      const [communityData, memberData, postData] = await Promise.all([
        getCommunity(id, token, signal),
        listCommunityMembers(id, token, signal),
        listCommunityPosts(id, token, signal),
      ])
      const commentEntries = await Promise.all(
        postData.map(async (post) => [post.id, await listPostComments(id, post.id, token, signal)] as const),
      )
      setCommunity(communityData)
      setMembers(memberData)
      setPosts(postData)
      setComments(Object.fromEntries(commentEntries))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a comunidade'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, id, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function selectPostImage(file?: File) {
    if (!file) return
    setPreparingImage(true)
    setActionMessage('')
    try { setPostImage(await prepareNewsCover(file)) }
    catch (error) { setActionMessage(error instanceof Error ? error.message : 'Não foi possível preparar a imagem') }
    finally { setPreparingImage(false) }
  }

  async function handleNewPost(event: FormEvent) {
    event.preventDefault()
    const content = newPost.trim()
    if (!token || !user || (!content && !postImage && !postLink.trim()) || submitting || preparingImage) return

    setSubmitting('post')
    setActionMessage('')
    try {
      const created = await createCommunityPost(id, content, token, { imagem: postImage || undefined, link: postLink.trim() || undefined })
      setPosts((current) => [{ ...created, authorName: user.nome }, ...current])
      setComments((current) => ({ ...current, [created.id]: [] }))
      setNewPost('')
      setPostImage('')
      setPostLink('')
      setShowLink(false)
      setActionMessage('Publicação enviada para a comunidade.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível publicar'
      if (message === 'Sua sessão expirou') clearSession()
      else setActionMessage(message)
    } finally {
      setSubmitting(null)
    }
  }

  async function handleComment(event: FormEvent, postId: number) {
    event.preventDefault()
    const content = commentDrafts[postId]?.trim()
    if (!token || !user || !content || submitting) return

    setSubmitting(`comment-${postId}`)
    setActionMessage('')
    try {
      const created = await createPostComment(id, postId, content, token)
      setComments((current) => ({
        ...current,
        [postId]: [...(current[postId] ?? []), { ...created, authorName: user.nome }],
      }))
      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível comentar'
      if (message === 'Sua sessão expirou') clearSession()
      else setActionMessage(message)
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return <main className="community-detail-feedback" aria-live="polite"><span /><p>Carregando comunidade...</p></main>
  }

  if (errorMessage || !community) {
    return (
      <main className="community-detail-feedback">
        <h1>Não foi possível abrir a comunidade</h1>
        <p>{errorMessage || 'Comunidade não encontrada'}</p>
        <Link to="/aluno/comunidades">Voltar às comunidades</Link>
      </main>
    )
  }

  const rules = community.regras?.split(/\n+/).map((rule) => rule.trim()).filter(Boolean) ?? []

  return (
    <main className="community-detail">
      <nav aria-label="Navegação estrutural"><Link to="/aluno/comunidades">Comunidades</Link><span>›</span><span>{community.nome}</span></nav>

      {community.capa ? <img className="community-detail-cover" src={community.capa} alt="" /> : null}
      <header className="community-detail__header">
        <div>
          <h1>{community.nome}</h1>
          <p>{community.descricao}</p>
          <div><span>{members.length} participantes</span><span>{posts.length} publicações</span></div>
        </div>
        <strong>Você participa</strong>
      </header>

      <div className="community-detail__layout">
        <section className="community-feed">
          <form className="community-composer" onSubmit={handleNewPost}>
            <span className="community-avatar">{user?.foto ? <img src={user.foto} alt="Sua foto de perfil" /> : initials(user?.nome ?? '')}</span>
            <label>
              <span className="sr-only">Nova publicação</span>
              <textarea value={newPost} onChange={(event) => setNewPost(event.target.value)} maxLength={2000} placeholder="Compartilhe algo com a comunidade..." />
            </label>

            <div className="community-composer__attachments">
              {postImage ? <div className="community-image-preview"><img src={postImage} alt="Prévia da imagem da publicação" /><button type="button" onClick={() => setPostImage('')}>Remover imagem</button></div> : null}
              {showLink ? <label className="community-link-field"><span>Link</span><input type="url" value={postLink} onChange={(event) => setPostLink(event.target.value)} placeholder="https://..." maxLength={2048} pattern="https?://.+" /><button type="button" onClick={() => { setPostLink(''); setShowLink(false) }}>Remover link</button></label> : null}
            </div>
            <div className="community-composer__toolbar">
              <label className="community-attach-control"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /></svg>{preparingImage ? 'Preparando...' : 'Imagem'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={preparingImage || Boolean(submitting)} onChange={(event) => { void selectPostImage(event.target.files?.[0]); event.target.value = '' }} /></label>
              <button type="button" className="community-attach-control" aria-expanded={showLink} onClick={() => setShowLink((current) => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></svg>Link</button>
              <button className="community-publish" type="submit" disabled={(!newPost.trim() && !postImage && !postLink.trim()) || Boolean(submitting) || preparingImage}>{submitting === 'post' ? 'Publicando...' : 'Publicar'}</button>
            </div>
          </form>

          {actionMessage ? <p className="community-action-message" role="status">{actionMessage}</p> : null}

          {posts.length ? posts.map((post) => (
            <article className="community-post" key={post.id}>
              <header>
                <span className="community-avatar">{post.authorId === user?.id && user.foto ? <img src={user.foto} alt="" /> : initials(post.authorName || 'CEMTN')}</span>
                <p><strong>{post.authorName || 'Participante CEMTN'}</strong><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time></p>
              </header>
              {post.conteudo ? <div className="community-post__content">{post.conteudo}</div> : null}
              {post.imagem ? <div className="community-post__image"><img src={post.imagem} alt="Imagem anexada à publicação" loading="lazy" /></div> : null}
              {post.link && /^https?:\/\//i.test(post.link) ? <a className="community-post__link" href={post.link} target="_blank" rel="noopener noreferrer">{post.link}<span aria-hidden="true"> ↗</span></a> : null}

              {(comments[post.id] ?? []).length ? (
                <div className="community-comments">
                  {(comments[post.id] ?? []).map((comment) => (
                    <div key={comment.id}>
                      <span className="community-avatar community-avatar--small">{comment.authorId === user?.id && user.foto ? <img src={user.foto} alt="" /> : initials(comment.authorName || 'CEMTN')}</span>
                      <p><strong>{comment.authorName || 'Participante CEMTN'}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time><span>{comment.conteudo}</span></p>
                    </div>
                  ))}
                </div>
              ) : null}

              <form className="community-comment-form" onSubmit={(event) => void handleComment(event, post.id)}>
                <label>
                  <span className="sr-only">Comentar na publicação de {post.authorName}</span>
                  <input value={commentDrafts[post.id] ?? ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={1000} placeholder="Escreva um comentário..." />
                </label>
                <button type="submit" disabled={!commentDrafts[post.id]?.trim() || Boolean(submitting)}>{submitting === `comment-${post.id}` ? 'Enviando...' : 'Comentar'}</button>
              </form>
            </article>
          )) : <div className="community-feed__empty"><h2>Comece a conversa</h2><p>Compartilhe uma ideia ou dúvida com o grupo.</p></div>}
        </section>

        <aside className="community-detail__aside">
          <details className="community-info"><summary>Informações do grupo</summary>
          <section><dl><div><dt>Responsável</dt><dd>Prof. {community.creatorName}</dd></div></dl></section>
          <section><h2>Regras de convivência</h2>{rules.length ? <ol>{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol> : <p>Respeite todos os membros, mantenha o foco no tema e evite conteúdos fora do assunto.</p>}</section>
          <section><div className="community-aside-title"><h2>Participantes ({members.length})</h2></div><div className="community-members">{members.slice(0, 8).map((member) => <span key={member.id} title={member.nome}>{member.id === user?.id && user.foto ? <img src={user.foto} alt="" /> : initials(member.nome)}</span>)}{members.length > 8 ? <span>+{members.length - 8}</span> : null}</div></section>
          </details>
        </aside>
      </div>
    </main>
  )
}
