import { useMemo, useState } from 'react'
import './ModerationPreviewPage.css'

type Severity = 'Alta' | 'Média' | 'Baixa'
type Status = 'Pendente' | 'Ocultada' | 'Liberada' | 'Em análise'
type AlertItem = { id: number; author: string; initials: string; role: string; community: string; time: string; severity: Severity; category: string; message: string; reason: string; status: Status }

const seed: AlertItem[] = [
  { id: 1048, author: 'Lucas Martins', initials: 'LM', role: 'Aluno', community: 'Turma 2º B', time: 'Hoje, 10:42', severity: 'Alta', category: 'Possível ameaça', message: 'Você vai ver o que acontece quando eu te encontrar depois da aula.', reason: 'A frase pode ser interpretada como ameaça e precisa de avaliação humana.', status: 'Pendente' },
  { id: 1047, author: 'Mariana Costa', initials: 'MC', role: 'Aluna', community: 'Clube de Ciências', time: 'Hoje, 09:18', severity: 'Média', category: 'Linguagem ofensiva', message: 'Esse trabalho ficou horrível, você não sabe fazer nada.', reason: 'Linguagem potencialmente humilhante dirigida a outra pessoa.', status: 'Pendente' },
  { id: 1046, author: 'Pedro Henrique', initials: 'PH', role: 'Aluno', community: 'Grêmio Estudantil', time: 'Ontem, 16:05', severity: 'Baixa', category: 'Linguagem inadequada', message: 'A reunião foi uma bagunça total.', reason: 'Expressão negativa sem alvo pessoal claro; pode ser um falso positivo.', status: 'Em análise' },
  { id: 1045, author: 'Ana Clara Souza', initials: 'AS', role: 'Professora', community: 'Projeto de Leitura', time: 'Ontem, 14:30', severity: 'Baixa', category: 'Revisão automática', message: 'Pessoal, vamos discutir o resultado da atividade com respeito.', reason: 'Exemplo demonstrativo de alerta que pode ser liberado após revisão.', status: 'Liberada' },
]

type Filter = 'Todas' | 'Pendentes' | 'Alta gravidade' | 'Em análise' | 'Resolvidas'

function Icon({ name }: { name: 'shield' | 'search' | 'filter' | 'clock' | 'check' | 'eye' | 'message' | 'alert' | 'arrow' }) {
  const paths = {
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-4-.9L3 20l1.5-4A7.2 7.2 0 0 1 4 12c0-4.4 3.6-8 8-8s8 3.1 8 7.5z" /></>,
    alert: <><path d="M12 3 22 20H2z" /><path d="M12 9v4M12 16h.01" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function ModerationPreviewPage() {
  const [items, setItems] = useState(seed)
  const [filter, setFilter] = useState<Filter>('Todas')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(1048)
  const [notice, setNotice] = useState('')

  const visible = useMemo(() => items.filter((item) => {
    const byFilter = filter === 'Todas' ||
      (filter === 'Pendentes' && item.status === 'Pendente') ||
      (filter === 'Alta gravidade' && item.severity === 'Alta') ||
      (filter === 'Em análise' && item.status === 'Em análise') ||
      (filter === 'Resolvidas' && (item.status === 'Ocultada' || item.status === 'Liberada'))
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return byFilter && (!term || [item.author, item.community, item.category, item.message].some((value) => value.toLocaleLowerCase('pt-BR').includes(term)))
  }), [items, filter, query])
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0]
  const pending = items.filter((item) => item.status === 'Pendente').length
  const high = items.filter((item) => item.severity === 'Alta' && item.status !== 'Ocultada' && item.status !== 'Liberada').length
  const resolved = items.filter((item) => item.status === 'Ocultada' || item.status === 'Liberada').length

  function decide(id: number, status: Status, action: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    setNotice(action + ' registrada na demonstração. Nenhuma publicação real foi alterada.')
  }

  return <main className="moderation-preview">
    <header className="mp-topline">
      <a className="mp-brand" href="/login"><span className="mp-brand-mark">C</span><span>CEMTN<small>Centro de Ensino Médio</small></span></a>
      <span className="mp-environment"><i /> AMBIENTE DE DEMONSTRAÇÃO</span>
    </header>
    <section className="mp-intro">
      <div><p className="mp-eyebrow"><Icon name="shield" /> SEGURANÇA DA COMUNIDADE</p><h1>Central de moderação</h1><p className="mp-lead">Analise alertas, entenda o contexto e registre decisões com responsabilidade.</p></div>
      <aside className="mp-intro-note"><Icon name="alert" /><span><strong>Decisão humana</strong><small>A análise automática sinaliza conteúdo; não aplica punições por conta própria.</small></span></aside>
    </section>
    <section className="mp-stats">
      <article><span className="mp-stat-icon mp-blue"><Icon name="message" /></span><div><small>Alertas registrados</small><strong>{String(items.length).padStart(2, '0')}</strong><span>Dados demonstrativos</span></div></article>
      <article><span className="mp-stat-icon mp-amber"><Icon name="clock" /></span><div><small>Aguardando revisão</small><strong>{String(pending).padStart(2, '0')}</strong><span>Precisam de avaliação</span></div></article>
      <article><span className="mp-stat-icon mp-red"><Icon name="alert" /></span><div><small>Alta gravidade</small><strong>{String(high).padStart(2, '0')}</strong><span>Prioridade de análise</span></div></article>
      <article><span className="mp-stat-icon mp-green"><Icon name="check" /></span><div><small>Revisões concluídas</small><strong>{String(resolved).padStart(2, '0')}</strong><span>Decisões registradas</span></div></article>
    </section>
    {notice && <div className="mp-notice" role="status">{notice}</div>}
    <section className="mp-workspace">
      <div className="mp-queue">
        <div className="mp-section-heading"><div><h2>Fila de alertas</h2><p>Selecione um registro para revisar</p></div><span>{visible.length} itens</span></div>
        <label className="mp-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoa, comunidade ou texto" /></label>
        <div className="mp-filters"><Icon name="filter" />{(['Todas', 'Pendentes', 'Alta gravidade', 'Em análise', 'Resolvidas'] as Filter[]).map((item) => <button type="button" key={item} onClick={() => { setFilter(item); setSelectedId(0) }} className={filter === item ? 'active' : ''}>{item}</button>)}</div>
        <div className="mp-list">{visible.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={'mp-report ' + (selected && selected.id === item.id ? 'selected' : '')}>
          <i className={'mp-dot mp-dot-' + item.severity.toLowerCase()} /><span className="mp-report-content"><span className="mp-report-meta"><strong>#{item.id}</strong><span>{item.time}</span></span><strong className="mp-report-title">{item.category}</strong><span className="mp-author">{item.author} · {item.community}</span><span className="mp-report-bottom"><span className={'mp-pill mp-pill-' + item.severity.toLowerCase()}>{item.severity}</span><span className="mp-status">{item.status}</span></span></span><span className="mp-report-arrow"><Icon name="arrow" /></span>
        </button>)}{visible.length === 0 && <div className="mp-empty">Nenhum alerta encontrado com esses filtros.</div>}</div>
      </div>
      <div className="mp-detail">{selected ? <>
        <div className="mp-section-heading"><div><p className="mp-eyebrow">DETALHES DO REGISTRO</p><h2>Alerta #{selected.id}</h2></div><span className={'mp-pill mp-pill-' + selected.severity.toLowerCase()}>{selected.severity} gravidade</span></div>
        <div className="mp-person"><span className="mp-avatar">{selected.initials}</span><span><strong>{selected.author}</strong><small>{selected.role} · {selected.community}</small></span><time>{selected.time}</time></div>
        <div className="mp-content-label"><span>CONTEÚDO SINALIZADO</span><span><Icon name="eye" /> Texto de exemplo</span></div>
        <blockquote className="mp-message">{selected.message}</blockquote>
        <div className="mp-analysis"><span className="mp-analysis-icon"><Icon name="shield" /></span><div><strong>Por que foi sinalizado</strong><p>{selected.reason}</p><small>Categoria sugerida: {selected.category}</small></div></div>
        <div className="mp-decision"><div><h3>Registrar decisão</h3><p>As ações abaixo alteram apenas os dados desta demonstração.</p></div>
          <button type="button" className="mp-button mp-allow" onClick={() => decide(selected.id, 'Liberada', 'Liberação')}><Icon name="check" /> Liberar conteúdo</button>
          <button type="button" className="mp-button mp-hide" onClick={() => decide(selected.id, 'Ocultada', 'Ocultação')}><Icon name="eye" /> Marcar como ocultada</button>
          <button type="button" className="mp-button mp-review" onClick={() => decide(selected.id, 'Em análise', 'Encaminhamento para análise')}><Icon name="message" /> Encaminhar para análise</button>
        </div>
        <div className="mp-audit"><Icon name="clock" /><span><strong>Rastreabilidade</strong><small>Na integração real, cada decisão terá responsável, data, justificativa e histórico de alterações.</small></span></div>
      </> : <div className="mp-empty mp-empty-detail">Escolha um alerta na fila para ver os detalhes.</div>}</div>
    </section>
    <footer className="mp-footer"><span>© CEMTN · Protótipo para validação interna</span><span>Dados fictícios · Sem conexão com a API de moderação</span></footer>
  </main>
}
