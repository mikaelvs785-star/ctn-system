import CommunityCoverEditor from '../../components/CommunityCoverEditor'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCommunity, updateCommunity, type CommunitySummary } from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './TeacherEditCommunityPage.css'

type IconName = 'community' | 'check' | 'info' | 'lock'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg className="teacher-edit-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function TeacherEditCommunityPage() {
  const { comunidadeId } = useParams()
  const id = Number(comunidadeId)
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [community, setCommunity] = useState<CommunitySummary | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [regras, setRegras] = useState('')
  const [loading, setLoading] = useState(true)
  const [capa, setCapa] = useState('')
  const [coverBusy, setCoverBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal: AbortSignal) => {
    if (!token || !Number.isInteger(id) || id <= 0) {
      setErrorMessage('O endereço desta comunidade é inválido')
      setLoading(false)
      return
    }

    try {
      const data = await getCommunity(id, token, signal)
      setCommunity(data)
      setNome(data.nome)
      setDescricao(data.descricao)
      setRegras(data.regras || ''); setCapa(data.capa || '')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a comunidade'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [clearSession, id, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const rules = useMemo(
    () => regras.split(/\n+/).map((rule) => rule.trim()).filter(Boolean),
    [regras],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (!token || !community || submitting || coverBusy || community.creatorId !== user?.id) return
    if (nome.trim().length < 2) {
      setErrorMessage('Informe o nome da comunidade')
      return
    }
    if (descricao.trim().length < 10) {
      setErrorMessage('Descreva a finalidade da comunidade com pelo menos 10 caracteres')
      return
    }

    setSubmitting(true)
    try {
      await updateCommunity(id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        regras: regras.trim(), capa: capa,
      }, token)
      navigate(`/professor/comunidades/${id}`, {
        replace: true,
        state: { communityUpdated: true },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar as alterações'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="teacher-edit-feedback" aria-live="polite"><span /><p>Carregando comunidade...</p></main>
  }

  if (!community) {
    return <main className="teacher-edit-feedback"><h1>Não foi possível editar</h1><p>{errorMessage || 'Comunidade não encontrada.'}</p><Link to="/professor/comunidades">Voltar às comunidades</Link></main>
  }

  if (community.creatorId !== user?.id) {
    return (
      <main className="teacher-edit-feedback teacher-edit-feedback--denied">
        <Icon name="lock" />
        <h1>Edição não autorizada</h1>
        <p>Somente o professor que criou esta comunidade pode alterar suas informações.</p>
        <Link to={`/professor/comunidades/${id}`}>Voltar à comunidade</Link>
      </main>
    )
  }

  return (
    <main className="teacher-edit-page">
      <nav aria-label="Navegação estrutural">
        <Link to="/professor/comunidades">Comunidades</Link><span>/</span>
        <Link to={`/professor/comunidades/${id}`}>{community.nome}</Link><span>/</span>
        <span>Editar</span>
      </nav>
      <header><h1>Editar comunidade</h1><p>Atualize as informações e as regras deste espaço.</p></header>

      <form onSubmit={handleSubmit}>
        <div className="teacher-edit-form">
          <section>
            <h2>Informações da comunidade</h2>
            <label>Nome da comunidade <b>*</b>
              <input value={nome} onChange={(event) => setNome(event.target.value)} maxLength={120} required />
              <small>{nome.length}/120 caracteres</small>
            </label>
            <label>Descrição <b>*</b>
              <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={2000} required />
              <small>{descricao.length}/2000 caracteres</small>
            </label>
          </section>
          <CommunityCoverEditor value={capa} onChange={setCapa} onBusyChange={setCoverBusy} />
          <section>
            <h2>Regras de convivência</h2>
            <p>Escreva uma regra por linha. Elas serão exibidas para todos os participantes.</p>
            <label><span className="sr-only">Regras da comunidade</span>
              <textarea value={regras} onChange={(event) => setRegras(event.target.value)} maxLength={5000} placeholder="Uma regra por linha" />
              <small>{regras.length}/5000 caracteres</small>
            </label>
          </section>
        </div>

        <aside className="teacher-edit-preview">
          <h2>Prévia da comunidade</h2>{capa ? <img className="community-cover-preview" src={capa} alt="Prévia da capa" /> : null}
          <div className="teacher-edit-preview__heading"><span><Icon name="community" /></span><div><strong>{nome.trim() || 'Nome da comunidade'}</strong><small>Por {community.creatorName}</small></div></div>
          <p>{descricao.trim() || 'A descrição da comunidade aparecerá aqui.'}</p>
          <div className="teacher-edit-preview__status"><i /> Comunidade ativa</div>
          <h3>Regras</h3>
          {rules.length ? <ol>{rules.slice(0, 5).map((rule, index) => <li key={`${index}-${rule}`}><span><Icon name="check" /></span>{rule}</li>)}</ol> : <div className="teacher-edit-preview__empty">Nenhuma regra cadastrada.</div>}
          <div className="teacher-edit-tip"><Icon name="info" /><p>As alterações serão vistas por todos os participantes após salvar.</p></div>
        </aside>

        {errorMessage ? <p className="teacher-edit-error" role="alert">{errorMessage}</p> : null}
        <footer>
          <Link to={`/professor/comunidades/${id}`}>Cancelar</Link>
          <button type="submit" disabled={submitting || coverBusy}>{submitting ? 'Salvando...' : 'Salvar alterações'}</button>
        </footer>
      </form>
    </main>
  )
}
