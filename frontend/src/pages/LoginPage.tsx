import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import ThemeToggle from '../components/ThemeToggle'
import { normalizeCpf } from '../utils/cpf'
import './LoginPage.css'

export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true })
  }, [navigate, status])

  function handleIdentifier(value: string) {
    setIdentifier(normalizeCpf(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')

    setSubmitting(true)
    setErrorMessage('')
    try {
      await login(identifier, password)
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Apresentação do CEMTN">
        <div className="ctn-logo ctn-logo--light" aria-label="CEMTN">CEMTN<span /></div>
        <div className="login-intro__content">
          <p className="login-eyebrow">CEMTN · TAGUATINGA NORTE</p>
          <h1>Informação que aproxima.<br />Educação que transforma.</h1>
          <p className="login-intro__description">Um ambiente único para acompanhar notícias, participar das comunidades e viver o dia a dia da escola.</p>
        </div>
        <p className="login-intro__footer">Centro de Ensino Médio de Taguatinga Norte</p>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <ThemeToggle className="theme-toggle--public" />
        <div className="login-card">
          <div className="login-mobile-brand">
            <div className="ctn-logo" aria-label="CEMTN">CEMTN<span /></div>
            <strong>CEMTN</strong>
          </div>
          <p className="login-eyebrow">BEM-VINDO DE VOLTA</p>
          <h2 id="login-title">Acesse sua conta</h2>
          <p className="login-card__subtitle">Entre com seu CPF e senha.</p>

          <form onSubmit={handleSubmit}>
            {errorMessage ? <div className="login-error" role="alert"><span>{errorMessage}</span></div> : null}

            <label className="form-field">
              <span>CPF</span>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h5M8 16h4" /></svg>
                <input type="text" value={identifier} onChange={(e) => handleIdentifier(e.target.value)} inputMode="numeric" pattern="[0-9]{11}" autoComplete="username" placeholder="Digite os 11 números do CPF" disabled={submitting} required />
              </div>
            </label>

            <label className="form-field">
              <span>Senha</span>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Digite sua senha" disabled={submitting} required />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} disabled={submitting}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                </button>
              </div>
            </label>

            <div className="login-options">
              <span className="login-security-note">Sessão protegida nesta aba</span>
              <Link className="forgot-password" to="/redefinir-senha">Esqueci minha senha</Link>
            </div>

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
              {submitting ? <span className="login-submit__spinner" /> : <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>}
            </button>
          </form>

          <div className="login-register-callout">
            <div><strong>Primeiro acesso?</strong><span>Alunos criam a própria conta e aguardam a validação da Direção.</span></div>
            <Link to="/cadastro">Criar minha conta</Link>
          </div>

          <div className="school-signature"><span /><p>CEMTN · Taguatinga Norte</p><span /></div>
          <p className="login-help">Problemas para acessar? Procure a secretaria da escola.</p>
        </div>
      </section>
    </main>
  )
}
