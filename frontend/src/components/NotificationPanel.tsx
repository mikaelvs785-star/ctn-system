import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import './NotificationPanel.css'

interface Notice { id: string; title: string; message: string; createdAt: string; kind: 'community' | 'news' | 'student'; targetId: number; read: boolean }
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}
export default function NotificationPanel() {
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<Notice[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(API_URL + '/notifications' + path, { ...init, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } })
    if (response.status === 401) { clearSession(); throw new Error('Sua sessão expirou') }
    if (!response.ok) throw new Error('Não foi possível carregar as notificações. Tente novamente.')
    return response.json()
  }, [token, clearSession])
  const refresh = useCallback(async () => {
    if (!token) return
    try { const data = await request(''); setItems(data as Notice[]); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar') }
    finally { setLoading(false) }
  }, [token, request])
  useEffect(() => {
    let active = true
    const update = () => { if (active && document.visibilityState === 'visible') void refresh() }
    update()
    const interval = window.setInterval(update, 60000)
    document.addEventListener('visibilitychange', update)
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [refresh])
  const unread = items.filter((item) => !item.read).length
  async function markRead(ids: string[]) {
    if (!ids.length) return true
    setSaving(true)
    try {
      await request('/read', { method: 'POST', body: JSON.stringify({ ids }) })
      setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, read: true } : item))
      return true
    } catch { setError('Não foi possível marcar como lida. Tente novamente.'); return false }
    finally { setSaving(false) }
  }
  async function openItem(item: Notice) {
    if (saving) return
    if (!item.read && !await markRead([item.id])) return
    const base = user?.role === 'DIRECAO' ? '/diretor' : user?.role === 'PROFESSOR' ? '/professor' : '/aluno'
    dialog.current?.close()
    navigate(item.kind === 'student' ? '/diretor/usuarios' : `${base}/${item.kind === 'news' ? 'jornal' : 'comunidades'}/${item.targetId}`)
  }
  return <>
    <button className="app-icon-button app-notification" type="button" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); void refresh() }}>
      <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unread && !error ? <span /> : null}
    </button>
    <dialog ref={dialog} className="notification-panel" aria-labelledby="notification-title" onClick={(event) => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close() } }}>
      <header><div><h2 id="notification-title">Notificações</h2><p>{unread ? `${unread} não lidas` : 'Você está em dia'}</p></div><button type="button" aria-label="Fechar notificações" onClick={() => dialog.current?.close()}>×</button></header>
      <div className="notification-toolbar"><button type="button" aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>Todas</button><button type="button" aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>Não lidas</button>{unread ? <button className="notification-read-all" type="button" disabled={saving} onClick={() => void markRead(items.filter((item) => !item.read).map((item) => item.id))}>Marcar como lidas</button> : null}</div>
      {error ? <div className="notification-empty" role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()}>Tentar novamente</button></div> : loading ? <p className="notification-empty" role="status">Carregando...</p> : <div className="notification-list">
        {(onlyUnread ? items.filter((item) => !item.read) : items).map((item) => <button type="button" key={item.id} disabled={saving} className={item.read ? 'notification-item' : 'notification-item notification-item--unread'} onClick={() => void openItem(item)}><strong>{item.title}</strong><p>{item.message}</p><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>{!item.read ? <span className="notification-unread" aria-label="Não lida" /> : null}</button>)}
        {!(onlyUnread ? items.some((item) => !item.read) : items.length) ? <div className="notification-empty"><strong>{onlyUnread ? 'Tudo lido por aqui' : 'Nenhuma notificação por enquanto'}</strong><p>Os avisos da escola e as atividades para você aparecem aqui.</p></div> : null}
      </div>}
      <footer>Até 50 atividades recentes e aprovações pendentes</footer>
    </dialog>
  </>
}
