import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listCommunities, type CommunitySummary } from '../../api/communities'
import { listNews, type NewsItem } from '../../api/news'
import { listUsers, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorDashboard.css'

type IconName = 'users' | 'student' | 'teacher' | 'news' | 'community' | 'plus' | 'arrow' | 'refresh'
interface Activity { id: string; title: string; description: string; date: string; icon: IconName }

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    student: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c3 3 9 3 12 0v-5" /></>,
    teacher: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c3 3 9 3 12 0v-5" /></>,
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="director-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function shortDate(value: string) {
  const date = new Date(value)
  const today = new Date()
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  return date.toDateString() === today.toDateString() ? `Hoje, ${time}` : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '')
}

export default function DirectorDashboard() {
  const { token, user, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [userData, newsData, communityData] = await Promise.all([
        listUsers(token, signal), listNews(token, signal), listCommunities(token, signal),
      ])
      setUsers(userData)
      setNews(newsData)
      setCommunities(communityData)
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

  const counts = useMemo(() => ({
    active: users.filter((item) => item.ativo).length,
    directors: users.filter((item) => item.role === 'DIRECAO' && item.ativo).length,
    teachers: users.filter((item) => item.role === 'PROFESSOR' && item.ativo).length,
    students: users.filter((item) => item.role === 'ALUNO' && item.ativo).length,
    others: users.filter((item) => !['DIRECAO', 'PROFESSOR', 'ALUNO'].includes(item.role) && item.ativo).length,
  }), [users])

  const activities = useMemo<Activity[]>(() => [
    ...users.map((item) => ({ id: `user-${item.id}`, title: item.role === 'ALUNO' ? 'Novo aluno cadastrado' : 'Novo usuário cadastrado', description: `${item.nome} foi cadastrado no sistema.`, date: item.createdAt, icon: 'users' as const })),
    ...news.map((item) => ({ id: `news-${item.id}`, title: 'Publicação criada no Jornal', description: `“${item.titulo}”`, date: item.createdAt, icon: 'news' as const })),
    ...communities.map((item) => ({ id: `community-${item.id}`, title: 'Comunidade criada', description: `“${item.nome}” foi criada por ${item.creatorName}.`, date: item.createdAt, icon: 'community' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3), [communities, news, users])

  if (loading) return <main className="director-feedback" aria-live="polite"><span /><p>Carregando painel da Direção...</p></main>
  if (errorMessage) return <main className="director-feedback"><h1>Não foi possível abrir o painel</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="director-dashboard">
      <header className="director-page-title"><div><h1>Visão geral</h1><p>Olá, {user?.nome.split(' ')[0]}. Acompanhe as pendências da escola.</p></div><Link className="journal-create" to="/diretor/usuarios/novo">+ Cadastrar professor ou diretor</Link></header>


      <section className="director-stats" aria-label="Resumo do sistema">
        <Link to="/diretor/usuarios"><span><Icon name="users" /></span><div><small>Usuários ativos</small><strong>{counts.active}</strong></div><Icon name="arrow" /></Link>
        <article><span><Icon name="teacher" /></span><div><small>Professores</small><strong>{counts.teachers}</strong></div></article>
        <article><span><Icon name="student" /></span><div><small>Alunos</small><strong>{counts.students}</strong></div></article>
        <Link to="/diretor/comunidades"><span><Icon name="community" /></span><div><small>Comunidades</small><strong>{communities.length}</strong></div><Icon name="arrow" /></Link>
      </section>

      <div className="director-main-grid">
        <section className="director-card director-activity">
          <div className="director-card-title"><h2>Alunos aguardando aprovação</h2><Link to="/diretor/usuarios">Ver todas <Icon name="arrow" /></Link></div>
          {users.filter(item => item.statusCadastro === 'PENDENTE').map(item => <article key={item.id}><div><strong>{item.nome}</strong><p>Cadastro de aluno</p></div><Link to="/diretor/usuarios?filtro=PENDENTE">Revisar cadastro →</Link></article>)}
          {!users.some(item => item.statusCadastro === 'PENDENTE') ? <p className="director-empty">Nenhum cadastro aguardando aprovação.</p> : null}
        </section>

        <section className="director-card director-actions">
          <div className="director-card-title"><h2>Ações rápidas</h2></div>
          <Link to="/diretor/usuarios/novo"><span><Icon name="users" /></span><strong>Cadastrar professor ou diretor</strong><Icon name="arrow" /></Link>
          <Link to="/diretor/jornal/nova"><span><Icon name="news" /></span><strong>Nova publicação</strong><Icon name="arrow" /></Link>
          <Link to="/diretor/comunidades/nova"><span><Icon name="community" /></span><strong>Criar comunidade</strong><Icon name="arrow" /></Link>
        </section>
      </div>

      <section className="director-card director-activity recent-activity">
        <div className="director-card-title"><h2>Atividade recente</h2></div>
        {activities.map(activity => <article key={activity.id}><div><strong>{activity.title}</strong><p>{activity.description}</p></div><time dateTime={activity.date}>{shortDate(activity.date)}</time></article>)}
        {!activities.length ? <p className="director-empty">Ainda não há atividades registradas.</p> : null}
      </section>
    </main>
  )
}
