import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listUsers, updateUserRegistrationStatus, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorUsersPage.css'
import ManagedUserPhoto from '../../components/ManagedUserPhoto'

type Filter = 'ALL' | 'PENDENTE' | 'DIRECAO' | 'PROFESSOR' | 'ALUNO'
const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDENTE', label: 'Aguardando aprovação' },
  { value: 'DIRECAO', label: 'Diretores' },
  { value: 'PROFESSOR', label: 'Professores' },
  { value: 'ALUNO', label: 'Alunos' },
]
const roleLabels: Record<string, string> = { ALUNO: 'Aluno', PROFESSOR: 'Professor', DIRECAO: 'Diretor' }
const statusLabels: Record<string, string> = {
  PENDENTE: 'Aguardando aprovação',
  ATIVO: 'Ativo',
  RECUSADO: 'Recusado',
  DESATIVADO: 'Desativado',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace('.', '')
}

export default function DirectorUsersPage() {
  const { token, user: authenticatedUser, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<Filter>(() => params.get('filtro') === 'PENDENTE' ? 'PENDENTE' : 'ALL')
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    listUsers(token, controller.signal).then(data => {
      if (!controller.signal.aborted) { setUsers(data); setErrorMessage(''); }
    }).catch(error => {
      if(controller.signal.aborted)return;
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os usuários';
      if(message === 'Sua sessão expirou')clearSession();
      else setErrorMessage(message);
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  }, [clearSession, token]);

  const visibleUsers = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return users.filter((item) => {
      const matchesFilter = filter === 'ALL'
        || (filter === 'PENDENTE' ? item.statusCadastro === 'PENDENTE' : item.role === filter)
      const haystack = [item.nome, item.email ?? '', item.cpfMascarado ?? ''].join(' ').toLocaleLowerCase('pt-BR')
      return matchesFilter && (statusFilter === 'ALL' || item.statusCadastro === statusFilter) && (!normalized || haystack.includes(normalized))
    })
  }, [deferredQuery, filter, users, statusFilter])

  const counts = useMemo(() => ({
    total: users.length,
    pending: users.filter((item) => item.statusCadastro === 'PENDENTE').length,
    teachers: users.filter((item) => item.role === 'PROFESSOR' && item.statusCadastro === 'ATIVO').length,
    students: users.filter((item) => item.role === 'ALUNO' && item.statusCadastro === 'ATIVO').length,
  }), [users])

  async function changeStatus(item: SystemUser, acao: 'APROVAR' | 'RECUSAR' | 'DESATIVAR' | 'REATIVAR') {
    if (!token || changingId !== null || item.id === authenticatedUser?.id) return
    const verbs = { APROVAR: 'aprovar', RECUSAR: 'recusar', DESATIVAR: 'desativar', REATIVAR: 'reativar' }
    if (!window.confirm(`Deseja realmente ${verbs[acao]} o acesso de ${item.nome}?`)) return

    setChangingId(item.id)
    setNotice('')
    setErrorMessage('')
    try {
      const updated = await updateUserRegistrationStatus(item.id, acao, token)
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setNotice(`${item.nome}: ${statusLabels[updated.statusCadastro]}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar o usuário'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setChangingId(null)
    }
  }

  if (loading) return <main className="users-page-feedback"><span /><p>Carregando usuários...</p></main>

  return (
    <main className="director-users-page">
      <header className="users-page-heading">
        <div><h1>Gestão de Usuários</h1><p>Aprove novos alunos e gerencie os acessos ao CEMTN.</p></div>
        <Link to="/diretor/usuarios/novo">＋ Cadastrar professor ou diretor</Link>
      </header>

      <section className="users-page-stats">
        <article><span>▤</span><div><small>Total de usuários</small><strong>{counts.total}</strong></div></article>
        <article className="users-stat-pending"><span>◷</span><div><small>Aguardando aprovação</small><strong>{counts.pending}</strong></div></article>
        <article><span>⌂</span><div><small>Professores ativos</small><strong>{counts.teachers}</strong></div></article>
        <article><span>◎</span><div><small>Alunos ativos</small><strong>{counts.students}</strong></div></article>
      </section>

      <section className="users-page-content">
        <div className="users-page-toolbar">
          <label><span className="sr-only">Buscar usuário</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou CPF..." /></label>
          <label className="user-status-filter">Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div role="tablist" aria-label="Perfis de usuários">{filters.map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}{item.value === 'PENDENTE' && counts.pending ? <b className="pending-count">{counts.pending}</b> : null}</button>)}</div>
        </div>

        {errorMessage ? <p className="users-page-message users-page-message--error" role="alert">{errorMessage}</p> : null}
        {notice ? <p className="users-page-message" role="status">{notice}</p> : null}

        <div className="users-table-heading"><span>Usuário</span><span>Perfil</span><span>CPF</span><span>Status</span><span>Atualização</span><span>Ação</span></div>
        <div className="users-list">
          {visibleUsers.map((item) => (
            <article key={item.id} className={item.statusCadastro === 'PENDENTE' ? 'user-row-pending' : ''}>
              <div className="users-list__identity"><ManagedUserPhoto key={`${item.id}:${item.updatedAt}`} id={item.id} name={item.nome} hasPhoto={Boolean(item.hasFoto)} token={token!} version={item.updatedAt}/><div><strong>{item.nome}</strong><small>{item.email ?? 'Cadastro por CPF'}</small></div></div>
              <div data-label="Perfil"><b>{roleLabels[item.role] ?? item.role}</b></div>
              <div data-label="CPF"><small>{item.cpfMascarado ?? 'Não cadastrado'}</small></div>
              <div data-label="Status"><i className={item.statusCadastro === 'ATIVO' ? 'active' : item.statusCadastro === 'PENDENTE' ? 'pending' : ''}><em />{statusLabels[item.statusCadastro]}</i></div>
              <div data-label="Atualização"><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div>
              <div className="users-actions users-actions--status">
                {item.statusCadastro === 'PENDENTE' ? <>
                  <button className="approve-user" type="button" onClick={() => void changeStatus(item, 'APROVAR')} disabled={changingId !== null}>Aprovar</button>
                  <button className="reject-user" type="button" onClick={() => void changeStatus(item, 'RECUSAR')} disabled={changingId !== null}>Recusar</button>
                </> : <>
                  <Link to={`/diretor/usuarios/${item.id}/editar`}>Editar</Link>
                  {item.statusCadastro === 'ATIVO' && item.id !== authenticatedUser?.id ? <button type="button" onClick={() => void changeStatus(item, 'DESATIVAR')} disabled={changingId !== null}>Desativar</button> : null}
                  {item.statusCadastro === 'DESATIVADO' ? <button type="button" onClick={() => void changeStatus(item, 'REATIVAR')} disabled={changingId !== null}>Reativar</button> : null}
                </>}
              </div>
            </article>
          ))}
          {!visibleUsers.length ? <div className="users-list-empty"><h2>Nenhum usuário encontrado</h2><p>Ajuste a busca ou selecione outro filtro.</p></div> : null}
        </div>
        <footer>Mostrando {visibleUsers.length} de {users.length} usuários carregados</footer>
      </section>
    </main>
  )
}
