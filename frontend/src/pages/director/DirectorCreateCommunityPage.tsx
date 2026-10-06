import CommunityCoverEditor from '../../components/CommunityCoverEditor'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCommunity } from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './DirectorCreateCommunityPage.css'

type IconName = 'community' | 'check' | 'info'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  }
  return <svg className="create-community-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function DirectorCreateCommunityPage() {
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [regras, setRegras] = useState('')
  const [capa, setCapa] = useState('')
  const [coverBusy, setCoverBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const rules = useMemo(() => regras.split(/\n+/).map((rule) => rule.trim()).filter(Boolean), [regras])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (nome.trim().length < 2) return setErrorMessage('Informe o nome da comunidade')
    if (descricao.trim().length < 10) return setErrorMessage('Descreva a finalidade da comunidade com pelo menos 10 caracteres')
    if (!token || submitting || coverBusy) return
    setSubmitting(true)
    try {
      await createCommunity({ nome: nome.trim(), descricao: descricao.trim(), regras: regras.trim(), capa: capa }, token)
      navigate(`${base}/comunidades`, { replace: true, state: { communityCreated: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a comunidade'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally { setSubmitting(false) }
  }

  return (
    <main className="create-community-page">
      <nav aria-label="Navegação estrutural"><Link to={`${base}/comunidades`}>Comunidades</Link><span>/</span><span>Nova comunidade</span></nav>
      <header><h1>Criar nova comunidade</h1><p>Configure um espaço para compartilhar conteúdos e promover discussões escolares.</p></header>

      <form onSubmit={handleSubmit}>
        <div className="create-community-form">
          <section>
            <h2>Informações da comunidade</h2>
            <label>Nome da comunidade <b>*</b><input value={nome} onChange={(event) => setNome(event.target.value)} maxLength={120} placeholder="Ex.: Feira de Ciências" required /><small>{nome.length}/120 caracteres</small></label>
            <label>Descrição <b>*</b><textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={2000} placeholder="Explique o objetivo e os assuntos desta comunidade..." required /><small>{descricao.length}/2000 caracteres</small></label>
          </section>

          <CommunityCoverEditor value={capa} onChange={setCapa} onBusyChange={setCoverBusy} />
          <section>
            <h2>Regras de convivência</h2>
            <p>Escreva uma regra por linha. Elas serão exibidas para todos os participantes.</p>
            <label><span className="sr-only">Regras da comunidade</span><textarea value={regras} onChange={(event) => setRegras(event.target.value)} maxLength={5000} placeholder={"Respeite todos os participantes.\nMantenha as publicações relacionadas ao tema.\nNão compartilhe dados pessoais."} /><small>{regras.length}/5000 caracteres</small></label>
          </section>
        </div>

        <aside className="create-community-preview">
          <h2>Prévia da comunidade</h2>{capa ? <img className="community-cover-preview" src={capa} alt="Prévia da capa" /> : null}
          <div className="create-community-preview__heading"><span><Icon name="community" /></span><div><strong>{nome.trim() || 'Nome da comunidade'}</strong><small>Por {user?.nome || 'Direção CEMTN'}</small></div></div>
          <p>{descricao.trim() || 'A descrição aparecerá aqui para ajudar os usuários a entenderem o objetivo deste espaço.'}</p>
          <div className="create-community-preview__status"><i /> Ativa após a criação</div>
          <h3>Regras</h3>
          {rules.length ? <ol>{rules.slice(0, 5).map((rule) => <li key={rule}><span><Icon name="check" /></span>{rule}</li>)}</ol> : <div className="create-community-preview__empty">As regras adicionadas aparecerão nesta área.</div>}
          <div className="create-community-tip"><Icon name="info" /><p>Você será adicionado automaticamente como criador e participante.</p></div>
        </aside>

        {errorMessage ? <p className="create-community-error" role="alert">{errorMessage}</p> : null}
        <footer><Link to={`${base}/comunidades`}>Cancelar</Link><button type="submit" disabled={submitting || coverBusy}>{submitting ? 'Criando...' : 'Criar comunidade'}</button></footer>
      </form>
    </main>
  )
}
