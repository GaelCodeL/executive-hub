import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Command, FileText, Filter, LayoutDashboard, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Settings2, Sparkles, Sun, Moon, Target,
  Users, X, Zap
} from 'lucide-react'

type Task = { id: number; title: string; project: string; due: string; priority: 'Alta' | 'Media' | 'Baja'; done: boolean }
type EventItem = { time: string; title: string; detail: string; kind: 'meeting' | 'focus' }

const initialTasks: Task[] = [
  { id: 1, title: 'Revisar propuesta comercial Q4', project: 'Dirección · Comercial', due: 'Hoy, 12:30', priority: 'Alta', done: false },
  { id: 2, title: 'Validar presupuesto de tecnología', project: 'Finanzas · Operaciones', due: 'Hoy, 15:00', priority: 'Alta', done: false },
  { id: 3, title: 'Enviar feedback a equipo de producto', project: 'Producto', due: 'Mañana', priority: 'Media', done: false },
  { id: 4, title: 'Preparar agenda comité semanal', project: 'Dirección', due: '20 nov', priority: 'Baja', done: true },
]
const events: EventItem[] = [
  { time: '09:30', title: 'Revisión de prioridades', detail: 'Con dirección · Sala principal', kind: 'meeting' },
  { time: '11:00', title: 'Bloque de trabajo estratégico', detail: 'Planificación Q1 · 90 min', kind: 'focus' },
  { time: '13:00', title: 'Seguimiento comercial', detail: 'Con equipo comercial · Teams', kind: 'meeting' },
  { time: '16:30', title: 'Cierre de jornada', detail: 'Revisión de acuerdos y tareas', kind: 'focus' },
]
const week = [
  { day: 'L', date: '16', active: false }, { day: 'M', date: '17', active: true },
  { day: 'X', date: '18', active: false }, { day: 'J', date: '19', active: false },
  { day: 'V', date: '20', active: false }, { day: 'S', date: '21', active: false }, { day: 'D', date: '22', active: false },
]

function App() {
  const [dark, setDark] = useState(false)
  const [active, setActive] = useState('Resumen')
  const [tasks, setTasks] = useState(initialTasks)
  const [showTask, setShowTask] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const completed = tasks.filter(t => t.done).length
  const pending = tasks.filter(t => !t.done).length
  const progress = useMemo(() => Math.round((completed / tasks.length) * 100), [completed, tasks.length])
  const nav = [
    { label: 'Resumen', icon: LayoutDashboard },
    { label: 'Agenda', icon: CalendarDays },
    { label: 'Tareas', icon: CheckCheck },
    { label: 'Reuniones', icon: Users },
    { label: 'Notas', icon: FileText },
  ]
  const addTask = () => {
    if (!newTask.trim()) return
    setTasks([{ id: Date.now(), title: newTask.trim(), project: 'Personal', due: 'Sin fecha', priority: 'Media', done: false }, ...tasks])
    setNewTask('')
    setShowTask(false)
    setActive('Tareas')
  }
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))

  return (
    <div className={`app-shell ${dark ? 'dark' : ''}`}>
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Command size={19}/></div><div><strong>EXECUTIVE<span>HUB</span></strong><small>PERSONAL WORKSPACE</small></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'selected' : ''}`} onClick={() => { setActive(item.label); setMobileMenu(false) }}><Icon size={18}/><span>{item.label}</span>{item.label === 'Tareas' && <em>{pending}</em>}</button> })}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16}/></div><strong>Un día más enfocado.</strong><p>Tu espacio para pensar, decidir y avanzar.</p><button onClick={() => setActive('Asistente')}>Explorar asistente <ArrowRight size={13}/></button></div>
          <button className="nav-item" onClick={() => setActive('Ajustes')}><Settings2 size={18}/><span>Preferencias</span></button>
          <div className="profile"><div className="avatar">GN</div><div className="profile-info"><strong>Gael Núñez</strong><small>Executive workspace</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><button className="icon-button" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><strong>EXECUTIVE<span>HUB</span></strong></div>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div>
          <div className="top-actions">
            <button className="search-trigger" onClick={() => setSearchOpen(!searchOpen)}><Search size={16}/><span>Buscar</span><kbd>⌘ K</kbd></button>
            <button className="icon-button theme-toggle" title="Cambiar tema" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button className="icon-button notification"><Bell size={18}/><i/></button>
            <div className="top-avatar">GN</div>
          </div>
        </header>

        {searchOpen && <div className="search-panel"><Search size={17}/><input autoFocus placeholder="Busca tareas, reuniones o notas..." onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}/><button onClick={() => setSearchOpen(false)}><X size={16}/></button></div>}

        <div className="content">
          {active === 'Resumen' ? <>
            <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> MARTES, 17 DE NOVIEMBRE DE 2026</div><h1>Buenos días, Gael <span className="wave">✳</span></h1><p className="welcome-sub">Este es el resumen de tu jornada. Vamos a por lo importante.</p></div><button className="date-button"><CalendarDays size={16}/> Hoy, 17 nov <ChevronDown size={15}/></button></section>

            <section className="stats-grid">
              <div className="stat-card"><div className="stat-top"><span>COMPROMISOS DE HOY</span><span className="stat-icon blue"><CalendarDays size={17}/></span></div><div className="stat-value">4 <small>en agenda</small></div><div className="stat-foot"><span className="trend neutral"><Clock3 size={13}/> 2 reuniones</span><span>Próxima en 1h 20m</span></div></div>
              <div className="stat-card"><div className="stat-top"><span>TAREAS PENDIENTES</span><span className="stat-icon amber"><Target size={17}/></span></div><div className="stat-value">{pending.toString().padStart(2, '0')} <small>por resolver</small></div><div className="stat-foot"><span className="trend up"><ArrowUpRight size={13}/> 2 prioritarias</span><span>{completed} completadas</span></div></div>
              <div className="stat-card"><div className="stat-top"><span>TIEMPO DE FOCO</span><span className="stat-icon violet"><Zap size={17}/></span></div><div className="stat-value">2h 30m <small>planificadas</small></div><div className="stat-foot"><span className="trend neutral">Objetivo: 3 horas</span><span>83% del objetivo</span></div></div>
              <div className="stat-card"><div className="stat-top"><span>PROGRESO SEMANAL</span><span className="stat-icon green"><Activity size={17}/></span></div><div className="stat-value">{progress}% <small>completado</small></div><div className="progress-track"><span style={{width: `${progress}%`}}/></div><div className="stat-foot"><span>Buen ritmo esta semana</span><span>{completed}/{tasks.length}</span></div></div>
            </section>

            <section className="dashboard-grid">
              <div className="panel agenda-panel"><div className="panel-heading"><div><div className="eyebrow">TU PLANIFICACIÓN</div><h2>Agenda de hoy</h2></div><button className="text-button" onClick={() => setActive('Agenda')}>Ver agenda <ArrowRight size={14}/></button></div>
                <div className="week-strip">{week.map(d => <button key={d.date} className={d.active ? 'day active-day' : 'day'}><span>{d.day}</span><strong>{d.date}</strong></button>)}</div>
                <div className="timeline">{events.map((ev, i) => <div className="timeline-row" key={ev.time}><div className="time">{ev.time}</div><div className={`timeline-marker ${ev.kind}`}/><div className="event-content"><strong>{ev.title}</strong><span>{ev.detail}</span></div><button className="more-button"><MoreHorizontal size={17}/></button></div>)}</div>
              </div>
              <div className="panel priorities-panel"><div className="panel-heading"><div><div className="eyebrow">FOCO DEL DÍA</div><h2>Prioridades</h2></div><button className="more-button"><MoreHorizontal size={18}/></button></div>
                <div className="priority-intro"><div className="priority-number">0{tasks.filter(t => !t.done && t.priority === 'Alta').length}</div><div><strong>Lo que mueve la aguja</strong><span>Empieza por estas tareas</span></div></div>
                {tasks.filter(t => !t.done).slice(0,3).map(t => <div className="priority-item" key={t.id}><button className="check-circle" onClick={() => toggleTask(t.id)} aria-label="Completar tarea"/><div><strong>{t.title}</strong><span>{t.due} · {t.project}</span></div><span className={`priority-tag ${t.priority.toLowerCase()}`}>{t.priority}</span></div>)}
                <button className="add-priority" onClick={() => setShowTask(true)}><Plus size={15}/> Añadir prioridad</button>
              </div>
            </section>

            <section className="bottom-grid">
              <div className="panel tasks-panel"><div className="panel-heading"><div><div className="eyebrow">POR HACER</div><h2>Tareas recientes</h2></div><button className="text-button" onClick={() => setActive('Tareas')}>Todas las tareas <ArrowRight size={14}/></button></div>
                {tasks.slice(0,4).map(t => <div className="task-row" key={t.id}><button className={`task-check ${t.done ? 'checked' : ''}`} onClick={() => toggleTask(t.id)}>{t.done && <Check size={13}/>}</button><div className="task-info"><strong className={t.done ? 'is-done' : ''}>{t.title}</strong><span>{t.project}</span></div><span className="task-due">{t.due}</span><span className={`priority-dot ${t.priority.toLowerCase()}`}/></div>)}
              </div>
              <div className="panel assistant-panel"><div className="assistant-heading"><div className="assistant-symbol"><Sparkles size={18}/></div><div><span>EXECUTIVE INTELLIGENCE</span><h2>Tu asistente</h2></div><span className="soon-tag">PREVIEW</span></div><p>Tu jornada está organizada. Tienes <strong>{pending} tareas pendientes</strong> y 4 compromisos planificados.</p><div className="insight"><Sparkles size={15}/><span>Consejo: reserva el bloque de media mañana para trabajo estratégico sin interrupciones.</span></div><button className="assistant-cta" onClick={() => setActive('Asistente')}>Abrir asistente <ArrowRight size={15}/></button></div>
            </section>
            <footer className="footer"><span>EXECUTIVE HUB <b>·</b> YOUR DAY. UNDER CONTROL.</span><span>DEMO WORKSPACE <i/> DATOS DE EJEMPLO</span></footer>
          </> : <section className="module-placeholder"><div className="module-icon"><Command size={25}/></div><div className="eyebrow">EXECUTIVE HUB</div><h1>{active}</h1><p>Este módulo forma parte del espacio de trabajo ejecutivo.</p><div className="placeholder-card"><Sparkles size={18}/><div><strong>Estamos preparando este espacio</strong><span>La siguiente iteración incorporará la gestión completa de {active.toLowerCase()}.</span></div></div><button className="primary-button" onClick={() => setActive('Resumen')}>Volver al resumen <ArrowRight size={15}/></button></section>}
        </div>
      </main>

      <nav className="mobile-nav">{nav.slice(0,5).map(item => { const Icon = item.icon; return <button key={item.label} className={active === item.label ? 'mobile-active' : ''} onClick={() => setActive(item.label)}><Icon size={19}/><span>{item.label === 'Resumen' ? 'Inicio' : item.label}</span></button> })}</nav>

      {showTask && <div className="modal-backdrop" onClick={() => setShowTask(false)}><div className="task-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">NUEVA PRIORIDAD</span><h2>Añadir tarea</h2></div><button className="icon-button" onClick={() => setShowTask(false)}><X size={18}/></button></div><input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="¿Qué necesitas sacar adelante?" autoFocus/><div className="modal-actions"><button className="secondary-button" onClick={() => setShowTask(false)}>Cancelar</button><button className="primary-button" onClick={addTask}>Crear tarea <ArrowRight size={15}/></button></div></div></div>}
    </div>
  )
}

export default App