import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import type { UserRole } from '../auth/auth.types'
import ThemeToggle from '../components/ThemeToggle'
import './AppLayout.css'

type IconName = 'home' | 'news' | 'communities' | 'users' | 'profile' | 'bell' | 'menu' | 'close' | 'logout'

interface NavigationItem {
  label: string
  path: string
  icon: IconName
}

const roleLabels: Partial<Record<UserRole, string>> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  DIRECAO: 'Direção',
}

const basePaths: Partial<Record<UserRole, string>> = {
  ALUNO: '/aluno',
  PROFESSOR: '/professor',
  DIRECAO: '/diretor',
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    communities: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    users: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M17 11a4 4 0 0 0 0-8M18 14a5 5 0 0 1 4 5v2" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: <><path d="m10 17 5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
  }

  return <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navigation = useMemo<NavigationItem[]>(() => {
    if (!user) return []
    const base = basePaths[user.role]
    if (!base) return []

    const items: NavigationItem[] = [
      { label: 'Visão geral', path: `${base}/inicio`, icon: 'home' },
      { label: 'Jornal', path: `${base}/jornal`, icon: 'news' },
      { label: 'Comunidades', path: `${base}/comunidades`, icon: 'communities' },
    ]

    if (user.role === 'DIRECAO') {
      items.push({ label: 'Usuários', path: `${base}/usuarios`, icon: 'users' })
    }

    items.push({ label: 'Meu perfil', path: `${base}/perfil`, icon: 'profile' })
    return items
  }, [user])

  if (!user) return <Outlet />

  const currentTitle =
    navigation.find((item) => location.pathname.startsWith(item.path))?.label ??
    'CEMTN'

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <aside className={menuOpen ? 'app-sidebar app-sidebar--open' : 'app-sidebar'}>
        <div className="app-sidebar__header">
          <div className="app-brand">CEMTN</div>
          <div className="app-brand-name"><small>Área {user.role === 'ALUNO' ? 'do aluno' : user.role === 'PROFESSOR' ? 'do professor' : 'da direção'}</small></div>
          <button className="app-icon-button app-sidebar__close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="app-navigation" aria-label="Navegação principal">

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => isActive ? 'app-navigation__link app-navigation__link--active' : 'app-navigation__link'}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__message">
          <span />
          <p>Informação que aproxima.<br />Educação que transforma.</p>
        </div>

        <div className="app-sidebar__profile">
          <div className="app-avatar">{user.foto ? <img src={user.foto} alt="" /> : getInitials(user.nome)}</div>
          <div><strong>{user.nome}</strong><small>{roleLabels[user.role] ?? user.role}</small></div>
          <button className="app-icon-button" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Sair do sistema">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button className="app-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
      ) : null}

      <div className="app-main">
        <header className="app-topbar">
          <button className="app-icon-button app-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
          <div className="app-topbar__title"><small>{roleLabels[user.role]}</small><span aria-hidden="true"> / </span><strong>{currentTitle}</strong></div>
          <div className="app-topbar__actions">
            <ThemeToggle />
            <button className="app-icon-button app-notification" type="button" aria-label="Notificações">
              <Icon name="bell" /><span />
            </button>
            <div className="app-avatar app-avatar--small">{user.foto ? <img src={user.foto} alt="" /> : getInitials(user.nome)}</div>
            <div className="app-topbar__user"><strong>{user.nome}</strong><small>{roleLabels[user.role] ?? user.role}</small></div>
          </div>
        </header>

        <div className="app-content"><Outlet /></div>
      </div>

      <nav className="app-bottom-nav" aria-label="Navegação mobile">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'app-bottom-nav__link app-bottom-nav__link--active' : 'app-bottom-nav__link'}
          >
            <Icon name={item.icon} />
            <span>{item.label === 'Visão geral' ? 'Início' : item.label.replace('Meu ', '')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
