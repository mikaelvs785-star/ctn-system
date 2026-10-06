import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createNews } from '../../api/news'
import { prepareNewsCover } from '../../utils/news-cover'
import { useAuth } from '../../auth/auth-context'
import './CreateNewsPage.css'

const categories = [
  ['COMUNICADO', 'Comunicado'], ['NOTICIA', 'Notícia'], ['AVISO', 'Aviso'],
  ['EVENTO', 'Evento'], ['ESPORTES', 'Esportes'], ['CIENCIAS', 'Ciências'],
  ['CULTURA', 'Cultura'], ['EDUCACAO', 'Educação'], ['PROJETO', 'Projeto'],
  ['INFORMACAO', 'Informação'], ['ATIVIDADE', 'Atividade'],
] as const
type IconName = 'news' | 'check' | 'info'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  }
  return <svg className="create-news-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function previewText(value: string) { return value.trim() || 'O conteúdo da publicação aparecerá nesta área.' }

export default function CreateNewsPage() {
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('COMUNICADO')
  const [conteudo, setConteudo] = useState('')
  const [capa, setCapa] = useState('')
  const [processingCover, setProcessingCover] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  const categoryLabel = useMemo(() => categories.find(([value]) => value === categoria)?.[1] ?? categoria, [categoria])

  async function handleCover(file?: File) {
    if (!file) return
    setProcessingCover(true)
    setErrorMessage('')
    try { setCapa(await prepareNewsCover(file)) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível preparar a capa') }
    finally { setProcessingCover(false) }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (titulo.trim().length < 5) return setErrorMessage('O título precisa ter pelo menos 5 caracteres')
    if (conteudo.trim().length < 20) return setErrorMessage('O conteúdo precisa ter pelo menos 20 caracteres')
    if (!token || submitting || processingCover) return
    setSubmitting(true)
    try {
      const created = await createNews({ titulo: titulo.trim(), conteudo: conteudo.trim(), categoria, ...(capa ? { capa } : {}) }, token)
      navigate(`${base}/jornal/${created.id}`, { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível publicar a notícia'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { setSubmitting(false) }
  }

  return (
    <main className="create-news-page">
      <nav><Link to={`${base}/jornal`}>Jornal CEMTN</Link><span>/</span><span>Nova publicação</span></nav>
      <header><h1>Nova publicação</h1><p>Compartilhe informações, comunicados e notícias com a comunidade escolar.</p></header>

      <form onSubmit={handleSubmit}>
        <div className="create-news-form">
          <section>
            <h2>Informações da publicação</h2>
            <label>Título <b>*</b><input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={200} placeholder="Digite um título claro e objetivo" required /><small>{titulo.length}/200 caracteres</small></label>
            <label>Categoria <b>*</b><select value={categoria} onChange={(event) => setCategoria(event.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Capa da publicação <b>*</b><input className="create-news-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleCover(event.target.files?.[0])} required={!capa} disabled={processingCover} /><small>{processingCover ? 'Preparando imagem...' : capa ? 'Capa pronta para publicação' : 'JPEG, PNG ou WebP · máximo 8 MB'}</small></label>
          </section>
          <section>
            <h2>Conteúdo</h2>
            <label><span className="sr-only">Conteúdo da publicação</span><textarea value={conteudo} onChange={(event) => setConteudo(event.target.value)} maxLength={20000} placeholder="Escreva a publicação completa..." required /><small>{conteudo.length}/20000 caracteres</small></label>
          </section>
        </div>

        <aside className="create-news-preview">
          <h2>Prévia no Jornal</h2>
          <div className="create-news-art">{capa ? <img src={capa} alt="Prévia da capa selecionada" /> : <><i /><span /></>}</div>
          <span className="create-news-category">{categoryLabel}</span>
          <h3>{titulo.trim() || 'Título da publicação'}</h3>
          <p>{previewText(conteudo).slice(0, 220)}{conteudo.trim().length > 220 ? '…' : ''}</p>
          <div className="create-news-author"><span>{user?.nome.slice(0, 1).toUpperCase()}</span><div><strong>{user?.nome}</strong><small>{user?.role === 'PROFESSOR' ? 'Professor' : 'Direção'} · Publicação nova</small></div></div>
          <ul><li><Icon name="check" /> Visível para todos os perfis</li><li><Icon name="check" /> Organizada pela categoria escolhida</li></ul>
          <div className="create-news-tip"><Icon name="info" /><p>Confira o título, a capa e a categoria antes de publicar.</p></div>
        </aside>

        {errorMessage ? <p className="create-news-error" role="alert">{errorMessage}</p> : null}
        <footer><Link to={`${base}/jornal`}>Cancelar</Link><button type="submit" disabled={submitting || processingCover || !capa}>{submitting ? 'Publicando...' : 'Publicar no Jornal'}</button></footer>
      </form>
    </main>
  )
}
