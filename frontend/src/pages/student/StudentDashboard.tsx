import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listCommunities, type CommunitySummary } from '../../api/communities'
import { listNews, type NewsItem } from '../../api/news'
import { useAuth } from '../../auth/auth-context'
import './StudentDashboard.css'

type IconName = 'news' | 'communities' | 'bell' | 'sigma' | 'chart' | 'science' | 'chat' | 'document' | 'arrow' | 'chevron' | 'refresh'
interface IconProps { name: IconName; size?: number }
interface Activity { id: string; icon: IconName; text: string; time: string; path: string; timestamp: number }

const IMPORTANT_CATEGORIES = new Set(['AVISO', 'COMUNICADO'])

function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    communities: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    sigma: <path d="M18 4H6l6 8-6 8h12" />,
    chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
    science: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M8 15h8" /></>,
    chat: <path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a9 9 0 1 1 18-5Z" />,
    document: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m15 18-6-6 6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="student-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return <div className="student-section-header"><h2>{title}</h2><Link to={to}>Ver todas <Icon name="arrow" size={15} /></Link></div>
}

function communityIcon(index: number): IconName {
  return (['sigma', 'chart', 'science'] as IconName[])[index % 3]
}

function plainText(value: string) {
  return value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function excerpt(value: string, limit = 120) {
  const text = plainText(value)
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value)).replace(/\./g, '').toUpperCase()
}

function relativeDate(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Data indisponível'
  const difference = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(difference / 60_000)
  if (minutes < 1) return 'Agora'
  if (minutes < 60) return `Há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Há ${hours}h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Há 1 dia' : `Há ${days} dias`
}

export default function StudentDashboard() {
  const { user, token, clearSession } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [activeHighlight, setActiveHighlight] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [newsData, communityData] = await Promise.all([
        listNews(token, signal),
        listCommunities(token, signal),
      ])
      setNews(newsData)
      setCommunities(communityData)
      setActiveHighlight(0)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o painel'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const participating = useMemo(
    () => communities.filter((community) => community.participating),
    [communities],
  )
  const highlights = news.slice(0, 4)
  const highlight = highlights[activeHighlight] ?? highlights[0]
  const headlines = news.slice(highlights.length, highlights.length + 2)
  const activities = useMemo<Activity[]>(() => [
    ...news.slice(0, 4).map((item) => ({
      id: `news-${item.id}`,
      icon: IMPORTANT_CATEGORIES.has(item.categoria) ? 'bell' as const : 'document' as const,
      text: `${item.authorName || 'Equipe CEMTN'} publicou “${item.titulo}”`,
      time: relativeDate(item.createdAt),
      path: `/aluno/jornal/${item.id}`,
      timestamp: new Date(item.createdAt).getTime(),
    })),
    ...participating.slice(0, 4).map((community) => ({
      id: `community-${community.id}`,
      icon: 'chat' as const,
      text: `${community.nome} possui ${community.postCount} publicaç${community.postCount === 1 ? 'ão' : 'ões'}`,
      time: relativeDate(community.updatedAt),
      path: `/aluno/comunidades/${community.id}`,
      timestamp: new Date(community.updatedAt).getTime(),
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4), [news, participating])

  const firstName = user?.nome.trim().split(/\s+/)[0] ?? 'Aluno'

  function changeHighlight(direction: -1 | 1) {
    if (highlights.length < 2) return
    setActiveHighlight((current) => (current + direction + highlights.length) % highlights.length)
  }

  if (loading) return <main className="student-dashboard-feedback" aria-live="polite"><span /><p>Carregando painel do aluno...</p></main>
  if (errorMessage) return <main className="student-dashboard-feedback"><h1>Não foi possível abrir o painel</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="student-dashboard">
      <header className="student-welcome"><div><div className="student-welcome__title"><h1>Olá, {firstName}.</h1><span>Aluno</span></div><p>Acompanhe as novidades e participe da comunidade CEMTN.</p></div></header>

      {news.find(item => IMPORTANT_CATEGORIES.has(item.categoria)) ? <Link className="student-announcement" to={`/aluno/jornal/${news.find(item => IMPORTANT_CATEGORIES.has(item.categoria))!.id}`}><Icon name="bell" /><strong>Comunicado</strong><span>{news.find(item => IMPORTANT_CATEGORIES.has(item.categoria))!.titulo}</span><Icon name="arrow" /></Link> : null}

      <div className="student-dashboard__grid">
        <section className="student-dashboard__news">
          <SectionHeader title="Destaques do Jornal" to="/aluno/jornal" />
          {highlight ? (
            <>
              <article className="student-highlight">
                <Link className="student-highlight__content" to={`/aluno/jornal/${highlight.id}`}><div className="student-highlight__meta"><span>{highlight.categoria}</span><time dateTime={highlight.createdAt}>{shortDate(highlight.createdAt)}</time></div><h3>{highlight.titulo}</h3><p>{excerpt(highlight.conteudo) || 'Abra a publicação para ler todos os detalhes.'}</p></Link>
                <div className="student-highlight__art">{highlight.capa ? <img src={highlight.capa} alt="" /> : <><i /><b /></>}</div>
                {highlights.length > 1 ? <><button type="button" className="student-carousel-arrow student-carousel-arrow--previous" onClick={() => changeHighlight(-1)} aria-label="Destaque anterior"><Icon name="chevron" /></button><button type="button" className="student-carousel-arrow student-carousel-arrow--next" onClick={() => changeHighlight(1)} aria-label="Próximo destaque"><Icon name="arrow" /></button><div className="student-carousel-dots" aria-label="Posição do carrossel">{highlights.map((item, index) => <button key={item.id} type="button" className={index === activeHighlight ? 'active' : ''} onClick={() => setActiveHighlight(index)} aria-label={`Mostrar destaque ${index + 1}`} />)}</div></> : null}
              </article>
              {headlines.length ? <div className="student-headlines">{headlines.map((item, index) => <Link to={`/aluno/jornal/${item.id}`} key={item.id}><div className={`student-headline-art ${index % 2 ? 'student-headline-art--science' : 'student-headline-art--education'}`}>{item.capa ? <img src={item.capa} alt="" /> : null}</div><div><span>{item.categoria}</span><time dateTime={item.createdAt}>{shortDate(item.createdAt)}</time><h3>{item.titulo}</h3><p>{excerpt(item.conteudo, 90)}</p></div></Link>)}</div> : null}
            </>
          ) : <div className="student-dashboard-empty"><Icon name="news" /><h3>O Jornal ainda não possui publicações</h3><p>As novidades da escola aparecerão aqui.</p></div>}
        </section>

        <aside className="student-dashboard__side">
          <section className="student-panel">
            <SectionHeader title="Minhas comunidades" to="/aluno/comunidades" />
            <div className="student-community-list">
              {participating.slice(0, 3).map((community, index) => <Link to={`/aluno/comunidades/${community.id}`} key={community.id}><span className="student-list-icon"><Icon name={communityIcon(index)} /></span><span><strong>{community.nome}</strong><small>{community.postCount} publicaç{community.postCount === 1 ? 'ão' : 'ões'} recentes</small></span><Icon name="arrow" size={16} /></Link>)}
              {!participating.length ? <div className="student-list-empty"><p>Você ainda não participa de comunidades.</p><Link to="/aluno/comunidades">Explorar comunidades</Link></div> : null}
            </div>
          </section>

          <section className="student-panel">
            <SectionHeader title="Atividade recente" to="/aluno/comunidades" />
            <div className="student-activity-list">
              {activities.map((activity) => <Link to={activity.path} key={activity.id}><span className="student-list-icon"><Icon name={activity.icon} size={17} /></span><span><strong>{activity.text}</strong><small>{activity.time}</small></span></Link>)}
              {!activities.length ? <div className="student-list-empty"><p>Nenhuma atividade recente.</p></div> : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
