import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinCommunity, listCommunities, type CommunitySummary } from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './StudentCommunitiesPage.css'

type Tab = 'mine' | 'explore'
type IconName = 'search' | 'sigma' | 'chart' | 'science' | 'users' | 'book' | 'person' | 'posts' | 'clock' | 'arrow' | 'refresh'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sigma: <path d="M18 4H6l6 8-6 8h12" />,
    chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
    science: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M8 15h8" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    book: <><path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2z" /><path d="M20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2z" /></>,
    person: <><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
    posts: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="communities-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function communityIcon(index: number): IconName {
  return (['sigma', 'chart', 'science', 'users', 'book'] as IconName[])[index % 5]
}

export default function StudentCommunitiesPage() {
  const { token, clearSession } = useAuth()
  const navigate = useNavigate()
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [tab, setTab] = useState<Tab>('explore')
  const [subject, setSubject] = useState('Todas')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      setCommunities(await listCommunities(token, signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar as comunidades'
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

  const visibleCommunities = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return communities.filter((community) => {
      const matchesTab = tab === 'mine' ? community.participating : true
      const matchesQuery = !normalizedQuery ||
        community.nome.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        community.descricao.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        community.creatorName.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      const text = `${community.nome} ${community.descricao}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const terms: Record<string, string[]> = { Esportes: ['esport', 'jog', 'treino'], Ciências: ['ciencia', 'experimento', 'pesquisa'], Cultura: ['cultura', 'leitura', 'arte', 'musica'] }
      const matchesSubject = subject === 'Todas' || (terms[subject] || []).some(term => text.includes(term))
      return matchesTab && matchesQuery && matchesSubject
    })
  }, [communities, deferredQuery, tab, subject])

  async function handleCommunity(community: CommunitySummary) {
    if (community.participating) {
      navigate(`/aluno/comunidades/${community.id}`)
      return
    }
    if (!token || joiningId !== null) return

    setJoiningId(community.id)
    setErrorMessage('')
    try {
      await joinCommunity(community.id, token)
      setCommunities((current) => current.map((item) =>
        item.id === community.id
          ? { ...item, participating: true, memberCount: item.memberCount + 1 }
          : item,
      ))
      navigate(`/aluno/comunidades/${community.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível participar'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setJoiningId(null)
    }
  }

  if (loading) {
    return <main className="communities-feedback" aria-live="polite"><span /><p>Carregando comunidades...</p></main>
  }

  if (errorMessage && communities.length === 0) {
    return <main className="communities-feedback"><h1>Não foi possível abrir as comunidades</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>
  }

  return (
    <main className="student-communities">
      <header className="student-communities__heading">
        <h1>Comunidades</h1>
        <p>Encontre seus grupos, compartilhe ideias e participe da vida escolar.</p>
      </header>

      <div className="student-communities__tabs" role="tablist" aria-label="Tipos de comunidade">
        <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Minhas comunidades</button>
        <button type="button" role="tab" aria-selected={tab === 'explore'} className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Explorar</button>
      </div>

      <div className="student-communities__toolbar">
        <label>
          <span className="sr-only">Buscar comunidade</span>
          <Icon name="search" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comunidade..." />
        </label>
        <div className="community-subject-filters" role="group" aria-label="Assuntos">{['Todas', 'Esportes', 'Ciências', 'Cultura'].map(label => <button type="button" key={label} aria-pressed={subject === label} onClick={() => setSubject(label)}>{label}</button>)}</div>
        <span>{visibleCommunities.length} resultado{visibleCommunities.length === 1 ? '' : 's'}</span>
      </div>

      {errorMessage ? <div className="communities-inline-error" role="alert">{errorMessage}</div> : null}

      <div className="student-communities__layout">
        <section className="community-cards" aria-live="polite">
          {visibleCommunities.length ? visibleCommunities.map((community, index) => (
            <article className="community-card" key={community.id}>
              <div className="community-card__cover">{community.capa ? <img src={community.capa} alt="" loading="lazy" /> : <Icon name={communityIcon(index)} />}<h2>{community.nome}</h2></div>
              <div className="community-card__content"><p>{community.descricao}</p><div className="community-card__metrics"><span><Icon name="users" /> {community.memberCount} participantes</span>{community.participating ? <span className="community-participating">Você participa</span> : null}</div></div>
              <button type="button" onClick={() => void handleCommunity(community)} disabled={joiningId !== null}>
                {joiningId === community.id ? 'Entrando...' : community.participating ? 'Acessar comunidade' : 'Entrar na comunidade'}
              </button>
            </article>
          )) : (
            <div className="communities-empty">
              <div><Icon name={tab === 'mine' ? 'users' : 'search'} /></div>
              <h2>{tab === 'mine' ? 'Você ainda não participa de comunidades' : 'Nenhuma comunidade encontrada'}</h2>
              <p>{tab === 'mine' ? 'Abra a aba Explorar para encontrar grupos disponíveis.' : 'Tente buscar usando outro termo.'}</p>
              {tab === 'mine' ? <button type="button" onClick={() => setTab('explore')}>Explorar comunidades</button> : null}
            </div>
          )}
        </section>


      </div>
    </main>
  )
}
