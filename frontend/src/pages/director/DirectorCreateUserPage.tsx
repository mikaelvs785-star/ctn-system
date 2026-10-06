import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUser, type CreateUserRole } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import { formatCpf, isValidCpf, normalizeCpf } from '../../utils/cpf'
import './DirectorCreateUserPage.css'

type IconName = 'user' | 'shield' | 'check' | 'info' | 'eye' | 'eyeOff'
const profiles: { value: CreateUserRole; label: string }[] = [
  { value: 'DIRECAO', label: 'Diretor' },
  { value: 'PROFESSOR', label: 'Professor' },
]
const permissions: Record<CreateUserRole, string[]> = {
  DIRECAO: ['Acessar o Jornal', 'Criar e gerenciar publicações', 'Gerenciar usuários', 'Criar e gerenciar comunidades', 'Visualizar relatórios administrativos', 'Acessar todas as áreas'],
  PROFESSOR: ['Acessar o Jornal', 'Criar e gerenciar publicações', 'Criar e gerenciar comunidades', 'Interagir com alunos'],
}
const descriptions: Record<CreateUserRole, string> = {
  DIRECAO: 'Acesso completo ao sistema, com permissões de gestão e administração.',
  PROFESSOR: 'Acesso às ferramentas de publicação e às comunidades escolares.',
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
    shield: <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12" /><circle cx="12" cy="12" r="2" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-2.2 2.8M6.1 6.1C3.5 8 2 12 2 12s4 6 10 6a9.8 9.8 0 0 0 3-.5" /></>,
  }
  return <svg className="create-user-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function DirectorCreateUserPage() {
  const { token, clearSession } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [role, setRole] = useState<CreateUserRole>('PROFESSOR')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const permissionList = useMemo(() => permissions[role], [role])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (nome.trim().length < 2) return setErrorMessage('Informe o nome completo')
    if (!isValidCpf(cpf)) return setErrorMessage('Informe um CPF válido')
    if (senha.length < 12) return setErrorMessage('A senha precisa ter pelo menos 12 caracteres')
    if (senha !== confirmacao) return setErrorMessage('A confirmação não corresponde à senha')
    if (!token || submitting) return

    setSubmitting(true)
    try {
      const created = await createUser({ nome: nome.trim(), cpf: normalizeCpf(cpf), senha, role }, token)
      navigate('/diretor/usuarios', { replace: true, state: { createdUserId: created.id } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível cadastrar o usuário'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="create-user-page">
      <nav aria-label="Navegação estrutural"><Link to="/diretor/usuarios">Usuários</Link><span>/</span><span>Novo usuário</span></nav>
      <header><h1>Cadastrar novo usuário</h1><p>Preencha os dados abaixo para criar um novo acesso ao CEMTN.</p></header>

      <form onSubmit={handleSubmit}>
        <div className="create-user-form">
          <section>
            <h2>Dados pessoais</h2>
            <label>Nome completo <b>*</b><input type="text" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" maxLength={120} placeholder="Digite o nome completo" required /></label>
          </section>

          <section>
            <h2>Dados de acesso</h2>
            <label>CPF <b>*</b><input type="text" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required /></label>
            <div className="create-password-row">
              <label>Senha provisória <b>*</b><span><input type={showPassword ? 'text' : 'password'} value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Mínimo de 12 caracteres" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button></span></label>
              <label>Confirmar senha <b>*</b><input type={showPassword ? 'text' : 'password'} value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Repita a senha" required /></label>
            </div>
            <p className="create-user-scope-note">Alunos criam a própria conta e são aprovados pela Direção. Aqui você cadastra apenas professores e outros diretores.</p><fieldset><legend>Perfil de acesso <b>*</b></legend>{profiles.map((profile) => <label key={profile.value}><input type="radio" name="role" value={profile.value} checked={role === profile.value} onChange={() => setRole(profile.value)} /><span />{profile.label}</label>)}</fieldset>
          </section>
        </div>

        <aside className="create-permissions">
          <header><span><Icon name="shield" /></span><div><h2>Permissões do perfil</h2><strong>{profiles.find((profile) => profile.value === role)?.label}</strong></div></header>
          <p>{descriptions[role]}</p>
          <ul>{permissionList.map((permission) => <li key={permission}><span><Icon name="check" /></span>{permission}</li>)}</ul>
          <div><Icon name="info" /><p>As permissões são atribuídas automaticamente de acordo com o perfil selecionado.</p></div>
        </aside>

        {errorMessage ? <p className="create-user-error" role="alert">{errorMessage}</p> : null}
        <footer><Link to="/diretor/usuarios">Cancelar</Link><button type="submit" disabled={submitting}>{submitting ? 'Cadastrando...' : 'Cadastrar usuário'}</button></footer>
      </form>
    </main>
  )
}
