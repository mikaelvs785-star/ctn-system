import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listNews, type NewsItem } from '../../api/news'
import { useAuth } from '../../auth/auth-context'
import './JournalPage.css'

type IconName = 'arrow' | 'chevron' | 'refresh'

const filters = [
  { value: 'ALL', label: 'Destaques' },
  { value: 'COMUNICADO', label: 'Comunicados' },
  { value: 'ESPORTES', label: 'Esportes' },
  { value: 'CIENCIAS', label: 'Ciências' },
  { value: 'CULTURA', label: 'Cultura' },
  { value: 'EDUCACAO', label: 'Educação' },
] as const

const categoryLabels: Record<string, string> = {
  AVISO: 'Aviso',
  EVENTO: 'Evento',
  INFORMACAO: 'Informação',
  PROJETO: 'Projeto',
  COMUNICADO: 'Comunicado',
  NOTICIA: 'Notícia',
  ATIVIDADE: 'Atividade',
  ESPORTES: 'Esportes',
  CIENCIAS: 'Ciências',
  CULTURA: 'Cultura',
  EDUCACAO: 'Educação',
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m15 18-6-6 6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="journal-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date)).replace('.', '').toUpperCase()
}

function excerpt(content: string, size = 120) {
  const plainText = content.replace(/<[^>]*>/g, '').trim()
  return plainText.length > size ? `${plainText.slice(0, size).trim()}…` : plainText
}

function ArticleArt({ variant = 0, cover }: { variant?: number; cover?: string | null }) {
  return <div className={`journal-art journal-art--${variant % 4}`}>{cover ? <img src={cover} alt="" /> : <span className="cover-fallback">CEMTN · Jornal</span>}</div>
}

function NewsLink({ item, className }: { item: NewsItem; className?: string }) {
  const { user } = useAuth()
  const base = user?.role === 'ALUNO' ? '/aluno' : user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  return <Link className={className} to={`${base}/jornal/${item.id}`} aria-label={`Ler: ${item.titulo}`} />
}

export default function JournalPage() {
  const { token, user, clearSession } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [activeSlide, setActiveSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const canPublish = user?.role === 'PROFESSOR' || user?.role === 'DIRECAO'
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'

  const loadNews = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      setNews(await listNews(token, signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o Jornal'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, token])

  useEffect(() => {
    const controller = new AbortController()
    void loadNews(controller.signal)
    return () => controller.abort()
  }, [loadNews])

  const filteredNews = useMemo(
    () => selectedFilter === 'ALL'
      ? news
      : news.filter((item) => item.categoria === selectedFilter),
    [news, selectedFilter],
  )

  const featured = filteredNews.slice(0, 3)
  const currentFeature = featured[activeSlide % Math.max(featured.length, 1)]
  const latest = filteredNews.filter((item) => item.id !== currentFeature?.id).slice(0, 12)

  function selectFilter(filter: string) {
    setSelectedFilter(filter)
    setActiveSlide(0)
  }

  function changeSlide(direction: -1 | 1) {
    if (featured.length < 2) return
    setActiveSlide((current) => (current + direction + featured.length) % featured.length)
  }

  if (loading) {
    return <main className="journal-feedback" aria-live="polite"><span /><p>Carregando Jornal...</p></main>
  }

  if (errorMessage) {
    return (
      <main className="journal-feedback">
        <h1>Não foi possível abrir o Jornal</h1>
        <p>{errorMessage}</p>
        <button type="button" onClick={() => void loadNews()}><Icon name="refresh" /> Tentar novamente</button>
      </main>
    )
  }

  return (
    <main className="journal-page">
      <header className="journal-heading">
        <div>
          <h1>Jornal CEMTN</h1>
          <p>Notícias e histórias da nossa escola.</p>
        </div>
        {canPublish ? <Link className="journal-create" to={`${base}/jornal/nova`}>+ Nova publicação</Link> : null}
      </header>

      <nav className="journal-filters" aria-label="Editorias do Jornal">
        {filters.map((filter) => (
          <button key={filter.value} type="button" className={selectedFilter === filter.value ? 'active' : ''} onClick={() => selectFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </nav>

      {currentFeature ? (
        <>
          <section className="journal-lead">
            <article className="journal-carousel">
              <ArticleArt variant={activeSlide} cover={currentFeature.capa} />
              <div className="journal-carousel__overlay" />
              <div className="journal-carousel__content">
                <div><span>{categoryLabels[currentFeature.categoria] ?? currentFeature.categoria}</span><time>{formatDate(currentFeature.createdAt)}</time></div>
                <h2>{currentFeature.titulo}</h2>
                <p>{excerpt(currentFeature.conteudo, 150)}</p>
                <NewsLink item={currentFeature} className="journal-read-link" />
                <span className="journal-read-label">Ler notícia <Icon name="arrow" /></span>
              </div>
              <button type="button" className="journal-carousel__arrow journal-carousel__arrow--left" onClick={() => changeSlide(-1)} aria-label="Notícia anterior"><Icon name="chevron" /></button>
              <button type="button" className="journal-carousel__arrow journal-carousel__arrow--right" onClick={() => changeSlide(1)} aria-label="Próxima notícia"><Icon name="arrow" /></button>
              <div className="journal-carousel__dots">
                {featured.map((item, index) => <button key={item.id} type="button" className={index === activeSlide ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Exibir notícia ${index + 1}`} />)}
              </div>
            </article>

            <section className="journal-latest">
              <div className="journal-block-title"><h2>Últimas notícias</h2></div>
              {latest.map((item, index) => (
                <article key={item.id}>
                  <ArticleArt variant={index + 1} cover={item.capa} />
                  <div><span>{categoryLabels[item.categoria] ?? item.categoria}</span><time>{formatDate(item.createdAt)}</time><h3>{item.titulo}</h3></div>
                  <NewsLink item={item} className="journal-card-link" />
                </article>
              ))}
            </section>
          </section>


        </>
      ) : (
        <section className="journal-empty">

          <h2>Nenhuma publicação encontrada</h2>
          <p>{selectedFilter === 'ALL' ? 'O Jornal ainda não possui publicações.' : 'Não há notícias nesta editoria.'}</p>
          {canPublish ? <Link className="journal-create" to={`${base}/jornal/nova`}>Criar primeira publicação</Link> : null}
        </section>
      )}
    </main>
  )
}
