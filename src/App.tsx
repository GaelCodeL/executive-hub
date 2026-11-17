import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, CheckCheck, ChevronRight,
  Clock3, Command, FileText, LayoutDashboard, Menu, Moon, MoreHorizontal,
  Plus, Search, Settings2, Sparkles, Sun, Target, Users, X, Zap, Trash2,
  Pencil, Pin, PinOff, ListTodo, CalendarPlus, Save, Filter, LogOut, Download, Upload
} from 'lucide-react'

type Priority = 'high' | 'medium' | 'low'
type Task = { id: string; title: string; description: string; project: string; dueAt: string; priority: Priority; status: 'pending' | 'in_progress' | 'completed'; createdAt: string }
type EventItem = { id: string; title: string; description: string; location: string; startsAt: string; endsAt: string; type: 'meeting' | 'focus' | 'reminder' | 'personal'; allDay: boolean }
type Meeting = { id: string; title: string; startsAt: string; endsAt: string; location: string; attendees: string; summary: string; agreements?: string }
type Note = { id: string; title: string; content: string; pinned: boolean; updatedAt: string }
type Store = { tasks: Task[]; events: EventItem[]; meetings: Meeting[]; notes: Note[]; displayName: string; theme: 'light' | 'dark' }
const STORE_KEY = 'executive-hub-v2'
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const localDateTime = (date: string, time: string) => date && time ? new Date(date + 'T' + time).toISOString() : ''
const dateInput = (value: string) => { if (!value) return ''; const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const timeInput = (value: string) => value ? new Date(value).toTimeString().slice(0, 5) : ''
const uid = () => crypto.randomUUID()
const seed: Store = {
  displayName: 'Gael', theme: 'light',
  tasks: [
    { id: 't1', title: 'Revisar propuesta comercial Q4', description: '', project: 'Dirección · Comercial', dueAt: localDateTime(today(), '12:30'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: 't2', title: 'Validar presupuesto de tecnología', description: '', project: 'Finanzas · Operaciones', dueAt: localDateTime(today(), '15:00'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: 't3', title: 'Enviar feedback a equipo de producto', description: '', project: 'Producto', dueAt: localDateTime(today(), '10:00'), priority: 'medium', status: 'in_progress', createdAt: new Date().toISOString() },
  ],
  events: [
    { id: 'e1', title: 'Revisión de prioridades', description: 'Con dirección', location: 'Sala principal', startsAt: localDateTime(today(), '09:30'), endsAt: localDateTime(today(), '10:00'), type: 'meeting', allDay: false },
    { id: 'e2', title: 'Bloque de trabajo estratégico', description: 'Planificación Q1', location: '', startsAt: localDateTime(today(), '11:00'), endsAt: localDateTime(today(), '12:30'), type: 'focus', allDay: false },
    { id: 'e3', title: 'Seguimiento comercial', description: 'Con equipo comercial', location: 'Teams', startsAt: localDateTime(today(), '13:00'), endsAt: localDateTime(today(), '13:45'), type: 'meeting', allDay: false },
  ],
  meetings: [
    { id: 'm1', title: 'Comité de dirección', startsAt: localDateTime(today(), '09:30'), endsAt: localDateTime(today(), '10:00'), location: 'Sala principal', attendees: 'Dirección', summary: 'Revisión de prioridades y seguimiento de objetivos.', agreements: 'Validar prioridades del trimestre y revisar avances en la próxima reunión.' },
  ],
  notes: [
    { id: 'n1', title: 'Ideas para Q1', content: 'Revisar objetivos estratégicos, presupuesto y capacidad del equipo.', pinned: true, updatedAt: new Date().toISOString() },
  ],
}
function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>
      return {
        ...seed,
        ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
        events: Array.isArray(parsed.events) ? parsed.events : seed.events,
        meetings: Array.isArray(parsed.meetings) ? parsed.meetings.map(m => ({ ...m, agreements: m.agreements || '' })) : seed.meetings,
        notes: Array.isArray(parsed.notes) ? parsed.notes : seed.notes,
      }
    }
  } catch { /* recover with demo data if storage is unavailable */ }
  return seed
}
const fmtDate = (value: string) => value ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(value)) : 'Sin fecha'
const fmtTime = (value: string) => value ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : ''
const priorityLabel = (p: Priority) => p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'
const blankTask = () => ({ title: '', description: '', project: '', dueDate: today(), dueTime: '12:00', priority: 'medium' as Priority })
const blankEvent = () => ({ title: '', description: '', location: '', date: today(), start: '10:00', end: '10:30', type: 'meeting' as EventItem['type'] })
const blankMeeting = () => ({ title: '', date: today(), start: '10:00', end: '10:30', location: '', attendees: '', summary: '', agreements: '' })

function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [active, setActive] = useState('Resumen')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [taskForm, setTaskForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState(false)
  const [meetingForm, setMeetingForm] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [taskDraft, setTaskDraft] = useState(blankTask)
  const [eventDraft, setEventDraft] = useState(blankEvent)
  const [meetingDraft, setMeetingDraft] = useState(blankMeeting)
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' })
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all')
  const [agendaDate, setAgendaDate] = useState(today())
  const [agendaView, setAgendaView] = useState<'day' | 'week' | 'month'>('week')
  const [toast, setToast] = useState('')
  const [settingsName, setSettingsName] = useState(store.displayName)
  const [settingsTheme, setSettingsTheme] = useState(store.theme)

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)) } catch { setToast('No se ha podido guardar en este dispositivo') } }, [store])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer) } }, [toast])
  useEffect(() => { document.documentElement.style.colorScheme = store.theme }, [store.theme])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(open => !open)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setTaskForm(false)
        setEventForm(false)
        setMeetingForm(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const save = (next: Store) => setStore(next)
  const tasks = store.tasks
  const events = store.events
  const pending = tasks.filter(t => t.status !== 'completed').length
  const completed = tasks.filter(t => t.status === 'completed').length
  const overdue = tasks.filter(t => t.status !== 'completed' && t.dueAt && dateInput(t.dueAt) < today()).length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const todayEvents = events.filter(e => dateInput(e.startsAt) === today()).sort((a,b) => a.startsAt.localeCompare(b.startsAt))
  const agendaSelectedDate = new Date(`${agendaDate}T12:00:00`)
  const weekStart = new Date(agendaSelectedDate); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d })
  const monthStart = new Date(agendaSelectedDate.getFullYear(), agendaSelectedDate.getMonth(), 1)
  const monthGridStart = new Date(monthStart); monthGridStart.setDate(1 - ((monthStart.getDay() + 6) % 7))
  const monthDates = Array.from({ length: 42 }, (_, i) => { const d = new Date(monthGridStart); d.setDate(d.getDate() + i); return d })
  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const agendaEvents = events.filter(e => dateInput(e.startsAt) === agendaDate).sort((a,b) => a.startsAt.localeCompare(b.startsAt))
  const setAgendaDay = (d: Date) => setAgendaDate(dateKey(d))
  const filteredTasks = tasks.filter(t => taskFilter === 'all' || (taskFilter === 'completed' ? t.status === 'completed' : taskFilter === 'overdue' ? t.status !== 'completed' && !!t.dueAt && dateInput(t.dueAt) < today() : t.status !== 'completed')).sort((a,b) => { const ad=a.dueAt?new Date(a.dueAt).getTime():Infinity; const bd=b.dueAt?new Date(b.dueAt).getTime():Infinity; return ad-bd })
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return [
      ...tasks.filter(x => (x.title + ' ' + x.project + ' ' + x.description).toLowerCase().includes(q)).map(x => ({ label: x.title, detail: 'Tarea', go: 'Tareas' })),
      ...events.filter(x => (x.title + ' ' + x.location).toLowerCase().includes(q)).map(x => ({ label: x.title, detail: 'Agenda', go: 'Agenda' })),
      ...store.meetings.filter(x => (x.title + ' ' + x.attendees).toLowerCase().includes(q)).map(x => ({ label: x.title, detail: 'Reunión', go: 'Reuniones' })),
      ...store.notes.filter(x => (x.title + ' ' + x.content).toLowerCase().includes(q)).map(x => ({ label: x.title, detail: 'Nota', go: 'Notas' })),
    ].slice(0, 12)
  }, [query, tasks, events, store.meetings, store.notes])

  const nav = [
    { label: 'Resumen', icon: LayoutDashboard }, { label: 'Agenda', icon: CalendarDays },
    { label: 'Tareas', icon: CheckCheck }, { label: 'Reuniones', icon: Users },
    { label: 'Notas', icon: FileText },
  ]
  const openTaskEditor = (task?: Task) => { setEditingTaskId(task?.id || null); setTaskDraft(task ? { title: task.title, description: task.description, project: task.project, dueDate: dateInput(task.dueAt), dueTime: timeInput(task.dueAt), priority: task.priority } : blankTask()); setTaskForm(true) }
  const addTask = () => {
    if (!taskDraft.title.trim()) return
    const existing = tasks.find(t => t.id === editingTaskId)
    const item: Task = { id: editingTaskId || uid(), title: taskDraft.title.trim(), description: taskDraft.description, project: taskDraft.project || 'General', dueAt: localDateTime(taskDraft.dueDate, taskDraft.dueTime), priority: taskDraft.priority, status: existing?.status || 'pending', createdAt: existing?.createdAt || new Date().toISOString() }
    save({ ...store, tasks: editingTaskId ? tasks.map(t => t.id === editingTaskId ? item : t) : [item, ...tasks] }); setTaskForm(false); setEditingTaskId(null); setTaskDraft(blankTask()); setToast(editingTaskId ? 'Tarea actualizada' : 'Tarea creada')
  }
  const toggleTask = (id: string) => save({ ...store, tasks: tasks.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'pending' } : t) })
  const removeTask = (id: string) => { if (confirm('¿Eliminar esta tarea?')) { save({ ...store, tasks: tasks.filter(t => t.id !== id) }); setToast('Tarea eliminada') } }
  const openEventEditor = (event?: EventItem) => { setEditingEventId(event?.id || null); setEventDraft(event ? { title: event.title, description: event.description, location: event.location, date: dateInput(event.startsAt), start: timeInput(event.startsAt), end: timeInput(event.endsAt), type: event.type } : blankEvent()); setEventForm(true) }
  const addEvent = () => {
    if (!eventDraft.title.trim()) return
    const item: EventItem = { id: editingEventId || uid(), title: eventDraft.title.trim(), description: eventDraft.description, location: eventDraft.location, startsAt: localDateTime(eventDraft.date, eventDraft.start), endsAt: localDateTime(eventDraft.date, eventDraft.end), type: eventDraft.type, allDay: false }
    if (new Date(item.endsAt) <= new Date(item.startsAt)) { setToast('La hora de fin debe ser posterior al inicio'); return }
    save({ ...store, events: editingEventId ? events.map(e => e.id === editingEventId ? item : e) : [...events, item] }); setEventForm(false); setEditingEventId(null); setEventDraft(blankEvent()); setToast(editingEventId ? 'Evento actualizado' : 'Evento añadido a la agenda')
  }
  const removeEvent = (id: string) => { if (confirm('¿Eliminar este evento?')) { save({ ...store, events: events.filter(e => e.id !== id) }); setToast('Evento eliminado') } }
  const openMeetingEditor = (meeting?: Meeting) => { setEditingMeetingId(meeting?.id || null); setMeetingDraft(meeting ? { title: meeting.title, date: dateInput(meeting.startsAt), start: timeInput(meeting.startsAt), end: timeInput(meeting.endsAt), location: meeting.location, attendees: meeting.attendees, summary: meeting.summary, agreements: meeting.agreements || '' } : blankMeeting()); setMeetingForm(true) }
  const addMeeting = () => {
    if (!meetingDraft.title.trim()) return
    const item: Meeting = { id: editingMeetingId || uid(), title: meetingDraft.title.trim(), startsAt: localDateTime(meetingDraft.date, meetingDraft.start), endsAt: localDateTime(meetingDraft.date, meetingDraft.end), location: meetingDraft.location, attendees: meetingDraft.attendees, summary: meetingDraft.summary, agreements: meetingDraft.agreements }
    if (new Date(item.endsAt) <= new Date(item.startsAt)) { setToast('La hora de fin debe ser posterior al inicio'); return }
    save({ ...store, meetings: editingMeetingId ? store.meetings.map(m => m.id === editingMeetingId ? item : m) : [item, ...store.meetings] }); setMeetingForm(false); setEditingMeetingId(null); setMeetingDraft(blankMeeting()); setToast(editingMeetingId ? 'Reunión actualizada' : 'Reunión creada')
  }
  const saveNote = () => {
    if (!noteDraft.title.trim() && !noteDraft.content.trim()) return
    const now = new Date().toISOString()
    const note: Note = { id: editingNote || uid(), title: noteDraft.title.trim() || 'Nota sin título', content: noteDraft.content, pinned: store.notes.find(n => n.id === editingNote)?.pinned || false, updatedAt: now }
    save({ ...store, notes: editingNote ? store.notes.map(n => n.id === editingNote ? note : n) : [note, ...store.notes] })
    setEditingNote(null); setNoteDraft({ title: '', content: '' }); setToast('Nota guardada')
  }
  const editNote = (note: Note) => { setEditingNote(note.id); setNoteDraft({ title: note.title, content: note.content }) }
  const deleteNote = (id: string) => { if (confirm('¿Eliminar esta nota?')) save({ ...store, notes: store.notes.filter(n => n.id !== id) }) }
  const togglePin = (id: string) => save({ ...store, notes: store.notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) })
  const setPage = (label: string) => { setActive(label); setMobileMenu(false); setSearchOpen(false) }
  const exportBackup = () => { const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'executive-hub-backup.json'; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('Copia de seguridad descargada') }
  const importBackup = async (file?: File) => { if (!file) return; try { const parsed = JSON.parse(await file.text()) as Store; if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.events) || !Array.isArray(parsed.meetings) || !Array.isArray(parsed.notes)) throw new Error('Formato no válido'); if (confirm('La importación reemplazará los datos actuales de este navegador. ¿Continuar?')) { save({ ...seed, ...parsed }); setSettingsName(parsed.displayName || 'Usuario'); setSettingsTheme(parsed.theme || 'light'); setToast('Copia restaurada correctamente') } } catch { setToast('El archivo no es una copia válida de EXECUTIVE HUB') } }

  const field = (label: string, child: React.ReactNode) => <label className="field"><span>{label}</span>{child}</label>
  const modal = (title: string, close: () => void, body: React.ReactNode, submit: () => void, submitLabel: string) => <div className="modal-backdrop" onClick={close}><div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">EXECUTIVE HUB</span><h2 id="dialog-title">{title}</h2></div><button className="icon-button" aria-label="Cerrar ventana" onClick={close}><X size={18}/></button></div>{body}<div className="modal-actions"><button className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" onClick={submit}><Save size={14}/>{submitLabel}</button></div></div></div>

  return <div className={`app-shell ${store.theme === 'dark' ? 'dark' : ''}`}>
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Command size={19}/></div><div><strong>EXECUTIVE<span>HUB</span></strong><small>PERSONAL WORKSPACE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'selected' : ''}`} onClick={() => setPage(item.label)}><Icon size={18}/><span>{item.label}</span>{item.label === 'Tareas' && <em>{pending}</em>}</button> })}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16}/></div><strong>Un día más enfocado.</strong><p>Tu espacio para pensar, decidir y avanzar.</p><button onClick={() => setPage('Asistente')}>Explorar asistente <ArrowRight size={13}/></button></div>
        <button className={`nav-item ${active === 'Preferencias' ? 'selected' : ''}`} onClick={() => setPage('Preferencias')}><Settings2 size={18}/><span>Preferencias</span></button>
        <div className="profile"><div className="avatar">{store.displayName.slice(0,2).toUpperCase()}</div><div className="profile-info"><strong>{store.displayName}</strong><small>Executive workspace</small></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><button className="icon-button" aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><strong>EXECUTIVE<span>HUB</span></strong></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="top-actions"><button className="search-trigger" aria-label={searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search size={16}/><span>Buscar</span><kbd>⌘ K</kbd></button><button className="icon-button theme-toggle" title="Cambiar tema" onClick={() => save({ ...store, theme: store.theme === 'dark' ? 'light' : 'dark' })}>{store.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button notification" onClick={() => setPage('Agenda')} title="Ver agenda"><Bell size={18}/></button><div className="top-avatar">{store.displayName.slice(0,2).toUpperCase()}</div></div></header>
      {mobileMenu && <button className="mobile-menu-scrim" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}/>}\n      {searchOpen && <div className="search-panel"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca tareas, eventos, reuniones o notas..."/><button onClick={() => { setSearchOpen(false); setQuery('') }}><X size={16}/></button>{query && <div className="search-results">{results.length ? results.map((r,i) => <button key={i} onClick={() => setPage(r.go)}><span>{r.label}</span><small>{r.detail}</small></button>) : <p>No hay resultados.</p>}</div>}</div>}
      <div className="content">
        {active === 'Resumen' && <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> {new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).toUpperCase()}</div><h1>Buenos días, {store.displayName} <span className="wave">✳</span></h1><p className="welcome-sub">Este es el resumen de tu jornada. Vamos a por lo importante.</p></div><button className="date-button" aria-label="Abrir agenda de hoy" onClick={() => { setAgendaDate(today()); setPage('Agenda') }}><CalendarDays size={16}/> Hoy <ChevronRight size={15}/></button></section>
          <section className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span>COMPROMISOS DE HOY</span><span className="stat-icon blue"><CalendarDays size={17}/></span></div><div className="stat-value">{todayEvents.length} <small>en agenda</small></div><div className="stat-foot"><span className="trend neutral"><Clock3 size={13}/> {todayEvents.filter(e=>e.type==='meeting').length} reuniones</span><span>Hoy</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>TAREAS PENDIENTES</span><span className="stat-icon amber"><Target size={17}/></span></div><div className="stat-value">{pending.toString().padStart(2,'0')} <small>por resolver</small></div><div className="stat-foot"><span className="trend up">{tasks.filter(t=>t.status!=='completed'&&t.priority==='high').length} prioritarias</span><span>{completed} completadas · {overdue} vencidas</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>REUNIONES</span><span className="stat-icon violet"><Zap size={17}/></span></div><div className="stat-value">{store.meetings.filter(m => dateInput(m.startsAt) === today()).length} <small>hoy</small></div><div className="stat-foot"><span className="trend neutral">{store.meetings.length} en total</span><span>Reuniones</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>PROGRESO DE TAREAS</span><span className="stat-icon green"><Activity size={17}/></span></div><div className="stat-value">{tasks.length ? `${progress}%` : '—'} <small>{tasks.length ? 'completado' : 'sin tareas'}</small></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><div className="stat-foot"><span>Buen ritmo</span><span>{completed}/{tasks.length}</span></div></div>
          </section>
          <section className="dashboard-grid"><div className="panel agenda-panel"><div className="panel-heading"><div><div className="eyebrow">TU PLANIFICACIÓN</div><h2>Agenda de hoy</h2></div><button className="text-button" onClick={() => setPage('Agenda')}>Ver agenda <ArrowRight size={14}/></button></div><div className="timeline">{todayEvents.length ? todayEvents.map(ev=><div className="timeline-row" key={ev.id}><div className="time">{fmtTime(ev.startsAt)}</div><div className={`timeline-marker ${ev.type==='focus'?'focus':''}`}/><div className="event-content"><strong>{ev.title}</strong><span>{ev.location || ev.description || 'Sin detalles'} · {fmtTime(ev.endsAt)}</span></div><button className="more-button" onClick={()=>{setAgendaDate(today());setPage('Agenda')}}><MoreHorizontal size={17}/></button></div>) : <p className="empty-state">No tienes eventos para hoy.</p>}<button className="add-priority" onClick={()=>setEventForm(true)}><Plus size={15}/> Añadir evento</button></div></div>
            <div className="panel priorities-panel"><div className="panel-heading"><div><div className="eyebrow">FOCO DEL DÍA</div><h2>Prioridades</h2></div><button className="text-button" onClick={()=>setPage('Tareas')}>Ver todas</button></div><div className="priority-intro"><div className="priority-number">{tasks.filter(t=>t.status!=='completed'&&t.priority==='high').length.toString().padStart(2,'0')}</div><div><strong>Lo que mueve la aguja</strong><span>Empieza por estas tareas</span></div></div>{tasks.filter(t=>t.status!=='completed').sort((a,b)=>['high','medium','low'].indexOf(a.priority)-['high','medium','low'].indexOf(b.priority)).slice(0,3).map(t=><div className="priority-item" key={t.id}><button className={`check-circle ${t.status==='in_progress'?'in-progress':t.status==='completed'?'done':''}`} onClick={()=>toggleTask(t.id)} aria-label={t.status==='pending'?'Iniciar tarea':t.status==='in_progress'?'Completar tarea':'Reabrir tarea'} title={t.status==='pending'?'Iniciar tarea':t.status==='in_progress'?'Completar tarea':'Reabrir tarea'}>{t.status==='in_progress'?<Clock3 size={12}/>:t.status==='completed'?<Check size={12}/>:null}</button><div><strong>{t.title}</strong><span>{t.project} · {priorityLabel(t.priority)}</span></div></div>)}<button className="add-priority" onClick={()=>setTaskForm(true)}><Plus size={15}/> Añadir prioridad</button></div></section>
          <section className="bottom-grid"><div className="panel tasks-panel"><div className="panel-heading"><div><div className="eyebrow">POR HACER</div><h2>Tareas recientes</h2></div><button className="text-button" onClick={()=>setPage('Tareas')}>Todas las tareas <ArrowRight size={14}/></button></div>{tasks.slice(0,4).map(t=><div className="task-row" key={t.id}><button className={`task-check ${t.status==='completed'?'checked':t.status==='in_progress'?'in-progress':''}`} onClick={()=>toggleTask(t.id)} aria-label={t.status==='pending'?'Iniciar tarea':t.status==='in_progress'?'Completar tarea':'Reabrir tarea'} title={t.status==='pending'?'Iniciar tarea':t.status==='in_progress'?'Completar tarea':'Reabrir tarea'}>{t.status==='completed'?<Check size={13}/>:t.status==='in_progress'?<Clock3 size={13}/>:null}</button><div className="task-info"><strong className={t.status==='completed'?'is-done':''}>{t.title}</strong><span>{t.project}</span></div><span className="task-due">{fmtDate(t.dueAt)}</span><span className={`priority-dot ${t.priority}`}/></div>)}</div><div className="panel assistant-panel"><div className="assistant-heading"><div className="assistant-symbol"><Sparkles size={18}/></div><div><span>EXECUTIVE INTELLIGENCE</span><h2>Tu asistente</h2></div><span className="soon-tag">PRÓXIMAMENTE</span></div><p>Tu espacio contiene <strong>{pending} tareas pendientes</strong>, {todayEvents.length} compromisos hoy y {store.notes.length} notas.</p><div className="insight"><Sparkles size={15}/><span>Consejo: reserva un bloque de tiempo para las tareas de prioridad alta.</span></div><button className="assistant-cta" onClick={()=>setPage('Asistente')}>Ver capacidades <ArrowRight size={15}/></button></div></section>
          <footer className="footer"><span>EXECUTIVE HUB <b>·</b> YOUR DAY. UNDER CONTROL.</span><span>DATOS GUARDADOS EN ESTE DISPOSITIVO</span></footer>
        </>}
        {active === 'Tareas' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">GESTIÓN PERSONAL</div><h1>Mis tareas</h1><p>Organiza prioridades, fechas y progreso.</p></div><button className="primary-button" onClick={()=>openTaskEditor()}><Plus size={15}/> Nueva tarea</button></div><div className="module-toolbar"><div className="filter-tabs">{(['all','pending','overdue','completed'] as const).map(f=><button key={f} className={taskFilter===f?'active':''} onClick={()=>setTaskFilter(f)}>{f==='all'?'Todas':f==='pending'?'Pendientes':f==='overdue'?'Vencidas':'Completadas'}</button>)}</div><span className="muted-small">{filteredTasks.length} tareas</span></div><div className="panel data-panel">{filteredTasks.length ? filteredTasks.map(t=><div className="data-row" key={t.id}><button className={`task-check ${t.status==='completed'?'checked':''}`} onClick={()=>toggleTask(t.id)}>{t.status==='completed'&&<Check size={13}/>}</button><div className="data-main"><strong className={t.status==='completed'?'is-done':''}>{t.title}</strong><span>{t.project} {t.dueAt?'· '+fmtDate(t.dueAt)+' '+fmtTime(t.dueAt):''}</span>{t.description&&<p>{t.description}</p>}{t.dueAt&&<span className={t.status!=='completed'&&dateInput(t.dueAt)<today()?'due-overdue':''}>{t.status==='completed'?'Completada':dateInput(t.dueAt)<today()?'Vencida':dateInput(t.dueAt)===today()?'Vence hoy':'Vence '+fmtDate(t.dueAt)}</span>}</div><span className={`priority-tag ${t.priority}`}>{priorityLabel(t.priority)}</span><button className="icon-button" title="Editar tarea" onClick={()=>openTaskEditor(t)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar tarea" onClick={()=>removeTask(t.id)}><Trash2 size={16}/></button></div>) : <p className="empty-state">No hay tareas en esta vista.</p>}</div></section>}
        {active === 'Agenda' && <section className="module-page">
          <div className="module-title"><div><div className="eyebrow">PLANIFICACIÓN</div><h1>Agenda</h1><p>Una visión clara de tus compromisos y tiempo de concentración.</p></div><button className="primary-button" onClick={()=>openEventEditor()}><Plus size={15}/> Nuevo evento</button></div>
          <div className="agenda-toolbar">
            <div className="agenda-view-switch">{(['day','week','month'] as const).map(v=><button key={v} className={agendaView===v?'active':''} onClick={()=>setAgendaView(v)}>{v==='day'?'Día':v==='week'?'Semana':'Mes'}</button>)}</div>
            <div className="agenda-navigation"><button className="secondary-button" onClick={()=>setAgendaDay(new Date(agendaSelectedDate.getFullYear(),agendaSelectedDate.getMonth(),agendaSelectedDate.getDate()-(agendaView==='day'?1:agendaView==='week'?7:30)))}>‹</button><button className="secondary-button" onClick={()=>setAgendaDate(today())}>Hoy</button><button className="secondary-button" onClick={()=>setAgendaDay(new Date(agendaSelectedDate.getFullYear(),agendaSelectedDate.getMonth(),agendaSelectedDate.getDate()+(agendaView==='day'?1:agendaView==='week'?7:30)))}>›</button><input aria-label="Seleccionar fecha" type="date" value={agendaDate} onChange={e=>setAgendaDate(e.target.value)}/></div>
          </div>
          {agendaView==='week' && <div className="week-calendar panel">{weekDates.map(d=>{const key=dateKey(d);const count=events.filter(e=>dateInput(e.startsAt)===key).length;return <button key={key} className={key===agendaDate?'selected':''} onClick={()=>setAgendaDate(key)}><span>{new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(d).replace('.','')}</span><strong>{d.getDate()}</strong><i className={count?'has-events':''}/></button>})}</div>}
          {agendaView==='month' && <div className="month-calendar panel"><div className="month-heading">{new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(agendaSelectedDate)}</div><div className="month-grid">{['L','M','X','J','V','S','D'].map((d,i)=><span className="month-weekday" key={i}>{d}</span>)}{monthDates.map(d=>{const key=dateKey(d);const count=events.filter(e=>dateInput(e.startsAt)===key).length;return <button key={key} className={`month-day ${d.getMonth()!==agendaSelectedDate.getMonth()?'outside':''} ${key===agendaDate?'selected':''}`} onClick={()=>setAgendaDate(key)}><span>{d.getDate()}</span>{count>0&&<i>{count}</i>}</button>})}</div></div>}
          <div className="agenda-selected-heading"><div><div className="eyebrow">{agendaView==='day'?'VISTA DIARIA':agendaView==='week'?'VISTA SEMANAL':'DÍA SELECCIONADO'}</div><h2>{new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(agendaSelectedDate)}</h2></div><span className="muted-small">{agendaEvents.length} {agendaEvents.length===1?'evento':'eventos'}</span></div>
          <div className="panel data-panel">{agendaEvents.map(ev=><div className="data-row" key={ev.id}><div className={`event-time-block event-type-${ev.type}`}><strong>{fmtTime(ev.startsAt)}</strong><span>{fmtTime(ev.endsAt)}</span></div><div className="data-main"><strong>{ev.title}</strong><span>{ev.location||'Sin ubicación'} · {ev.type==='meeting'?'Reunión':ev.type==='focus'?'Trabajo de foco':ev.type==='reminder'?'Recordatorio':'Personal'}</span>{ev.description&&<p>{ev.description}</p>}</div><button className="icon-button" title="Editar evento" onClick={()=>openEventEditor(ev)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar evento" onClick={()=>removeEvent(ev.id)}><Trash2 size={16}/></button></div>)}{!agendaEvents.length&&<p className="empty-state">No hay eventos para esta fecha. Añade uno para planificar tu día.</p>}</div>
        </section>}
        {active === 'Reuniones' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">SEGUIMIENTO Y ACUERDOS</div><h1>Reuniones</h1><p>Registra asistentes, contexto, actas y acuerdos.</p></div><button className="primary-button" onClick={()=>openMeetingEditor()}><Plus size={15}/> Nueva reunión</button></div><div className="meeting-grid">{store.meetings.map(m=><article className="panel meeting-card" key={m.id}><div className="meeting-card-top"><span className="meeting-date">{fmtDate(m.startsAt)} · {fmtTime(m.startsAt)}</span><div><button className="icon-button" title="Editar reunión" onClick={()=>openMeetingEditor(m)}><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>{if(confirm('¿Eliminar esta reunión?'))save({...store,meetings:store.meetings.filter(x=>x.id!==m.id)})}}><Trash2 size={15}/></button></div></div><h3>{m.title}</h3><p className="meeting-meta"><Users size={14}/> {m.attendees||'Sin asistentes indicados'}</p><p className="meeting-meta"><CalendarDays size={14}/> {m.location||'Sin ubicación'}</p><div className="meeting-summary"><strong>Acta / contexto</strong><p>{m.summary||'Todavía no hay acta o resumen.'}</p><div className="meeting-agreements"><strong>Acuerdos y próximos pasos</strong><p>{m.agreements||'Sin acuerdos registrados todavía.'}</p></div></div></article>)}{!store.meetings.length&&<p className="empty-state">Todavía no has registrado reuniones.</p>}</div></section>}
        {active === 'Notas' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">CONOCIMIENTO Y CONTEXTO</div><h1>Notas</h1><p>Captura ideas, decisiones y puntos importantes.</p></div><button className="primary-button" onClick={()=>{setEditingNote(null);setNoteDraft({title:'',content:''})}}><Plus size={15}/> Nueva nota</button></div><div className="notes-layout"><div className="panel note-editor"><div className="eyebrow">{editingNote?'EDITAR NOTA':'NUEVA NOTA'}</div><input className="note-title-input" value={noteDraft.title} onChange={e=>setNoteDraft({...noteDraft,title:e.target.value})} placeholder="Título de la nota"/><textarea value={noteDraft.content} onChange={e=>setNoteDraft({...noteDraft,content:e.target.value})} placeholder="Escribe aquí tus ideas, decisiones o recordatorios..."/><div className="note-editor-actions"><button className="secondary-button" onClick={()=>{setEditingNote(null);setNoteDraft({title:'',content:''})}}>Limpiar</button><button className="primary-button" onClick={saveNote}><Save size={14}/> Guardar nota</button></div></div><div className="notes-list">{[...store.notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(n=><article className="panel note-card" key={n.id}><div className="note-card-head"><strong>{n.title}</strong><div><button className="icon-button" title={n.pinned?'Desfijar':'Fijar'} onClick={()=>togglePin(n.id)}>{n.pinned?<Pin size={15}/>:<PinOff size={15}/>}</button><button className="icon-button" title="Editar" onClick={()=>editNote(n)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar" onClick={()=>deleteNote(n.id)}><Trash2 size={15}/></button></div></div><p>{n.content||'Nota vacía'}</p><small>Actualizada {fmtDate(n.updatedAt)}</small></article>)}{!store.notes.length&&<p className="empty-state">Aún no tienes notas guardadas.</p>}</div></div></section>}
        {active === 'Preferencias' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">PERSONALIZACIÓN</div><h1>Preferencias</h1><p>Adapta tu espacio de trabajo.</p></div></div><div className="panel settings-panel"><div className="setting-row"><div><strong>Nombre visible</strong><span>Se utiliza en el saludo y el perfil.</span></div><input value={settingsName} onChange={e=>setSettingsName(e.target.value)} /></div><div className="setting-row"><div><strong>Apariencia</strong><span>Selecciona el tema de la aplicación.</span></div><select value={settingsTheme} onChange={e=>setSettingsTheme(e.target.value as 'light'|'dark')}><option value="light">Corporate Light</option><option value="dark">Executive Dark</option></select></div><div className="setting-row"><div><strong>Almacenamiento</strong><span>Tus cambios se guardan automáticamente en este navegador.</span></div><span className="storage-status">Activo · Local</span></div><div className="settings-actions"><button className="secondary-button" onClick={exportBackup}><Download size={14}/> Exportar copia</button><label className="secondary-button import-backup"><Upload size={14}/> Importar copia<input type="file" accept="application/json,.json" onChange={e=>{void importBackup(e.target.files?.[0]);e.currentTarget.value=''}} /></label><button className="primary-button" onClick={()=>{save({...store,displayName:settingsName.trim()||'Usuario',theme:settingsTheme});setToast('Preferencias guardadas')}}><Save size={14}/> Guardar preferencias</button><button className="secondary-button" onClick={()=>{if(confirm('Esto eliminará todos los datos locales de esta demo y restaurará los datos de ejemplo. ¿Continuar?')){save(seed);setSettingsName(seed.displayName);setSettingsTheme(seed.theme);setToast('Datos de ejemplo restaurados')}}}><LogOut size={14}/> Restaurar demo</button></div></div><div className="notice-panel"><Sparkles size={17}/><p><strong>Sincronización en la nube pendiente.</strong> La conexión con Supabase se habilitará cuando configuremos el inicio de sesión. De momento, esta versión conserva los datos en este dispositivo y navegador.</p></div></section>}
        {active === 'Asistente' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">EXECUTIVE INTELLIGENCE</div><h1>Asistente ejecutivo</h1><p>Herramientas inteligentes para preparar y revisar tu jornada.</p></div></div><div className="assistant-feature-grid"><div className="panel"><Sparkles/><h3>Briefing diario</h3><p>Resumen de agenda, tareas prioritarias y compromisos.</p><span className="soon-tag">REQUIERE IA</span></div><div className="panel"><FileText/><h3>Resumen de reuniones</h3><p>Convierte notas y acuerdos en un acta estructurada.</p><span className="soon-tag">REQUIERE IA</span></div><div className="panel"><ListTodo/><h3>Extraer tareas</h3><p>Detecta acciones y responsables a partir de notas.</p><span className="soon-tag">REQUIERE IA</span></div></div></section>}
      </div>
    </main>
    <nav className="mobile-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?'mobile-active':''} onClick={()=>setPage(item.label)}><Icon size={19}/><span>{item.label==='Resumen'?'Inicio':item.label}</span></button>})}</nav>
    {taskForm && modal(editingTaskId ? 'Editar tarea' : 'Nueva tarea',()=>setTaskForm(false),<div className="form-grid">{field('Título',<input value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} placeholder="¿Qué necesitas hacer?"/>)}{field('Proyecto / área',<input value={taskDraft.project} onChange={e=>setTaskDraft({...taskDraft,project:e.target.value})} placeholder="General"/>)}{field('Fecha',<input type="date" value={taskDraft.dueDate} onChange={e=>setTaskDraft({...taskDraft,dueDate:e.target.value})}/>)}{field('Hora',<input type="time" value={taskDraft.dueTime} onChange={e=>setTaskDraft({...taskDraft,dueTime:e.target.value})}/>)}{field('Prioridad',<select value={taskDraft.priority} onChange={e=>setTaskDraft({...taskDraft,priority:e.target.value as Priority})}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select>)}{field('Descripción',<textarea value={taskDraft.description} onChange={e=>setTaskDraft({...taskDraft,description:e.target.value})} placeholder="Detalles opcionales"/>)}</div>,addTask,'Crear tarea')}
    {eventForm && modal(editingEventId ? 'Editar evento' : 'Nuevo evento',()=>setEventForm(false),<div className="form-grid">{field('Título',<input value={eventDraft.title} onChange={e=>setEventDraft({...eventDraft,title:e.target.value})}/>)}{field('Fecha',<input type="date" value={eventDraft.date} onChange={e=>setEventDraft({...eventDraft,date:e.target.value})}/>)}{field('Inicio',<input type="time" value={eventDraft.start} onChange={e=>setEventDraft({...eventDraft,start:e.target.value})}/>)}{field('Fin',<input type="time" value={eventDraft.end} onChange={e=>setEventDraft({...eventDraft,end:e.target.value})}/>)}{field('Ubicación',<input value={eventDraft.location} onChange={e=>setEventDraft({...eventDraft,location:e.target.value})}/>)}{field('Tipo',<select value={eventDraft.type} onChange={e=>setEventDraft({...eventDraft,type:e.target.value as EventItem['type']})}><option value="meeting">Reunión</option><option value="focus">Trabajo de foco</option><option value="reminder">Recordatorio</option><option value="personal">Personal</option></select>)}{field('Descripción',<textarea value={eventDraft.description} onChange={e=>setEventDraft({...eventDraft,description:e.target.value})}/>)}</div>,addEvent,'Guardar evento')}
    {meetingForm && modal(editingMeetingId ? 'Editar reunión' : 'Nueva reunión',()=>setMeetingForm(false),<div className="form-grid">{field('Título',<input value={meetingDraft.title} onChange={e=>setMeetingDraft({...meetingDraft,title:e.target.value})}/>)}{field('Fecha',<input type="date" value={meetingDraft.date} onChange={e=>setMeetingDraft({...meetingDraft,date:e.target.value})}/>)}{field('Inicio',<input type="time" value={meetingDraft.start} onChange={e=>setMeetingDraft({...meetingDraft,start:e.target.value})}/>)}{field('Fin',<input type="time" value={meetingDraft.end} onChange={e=>setMeetingDraft({...meetingDraft,end:e.target.value})}/>)}{field('Ubicación',<input value={meetingDraft.location} onChange={e=>setMeetingDraft({...meetingDraft,location:e.target.value})}/>)}{field('Asistentes',<input value={meetingDraft.attendees} onChange={e=>setMeetingDraft({...meetingDraft,attendees:e.target.value})} placeholder="Nombres o equipos"/>)}{field('Acta / contexto',<textarea value={meetingDraft.summary} onChange={e=>setMeetingDraft({...meetingDraft,summary:e.target.value})} placeholder="Temas tratados, decisiones y contexto..."/>)}{field('Acuerdos y próximos pasos',<textarea value={meetingDraft.agreements} onChange={e=>setMeetingDraft({...meetingDraft,agreements:e.target.value})} placeholder="Acciones acordadas, responsables y fechas..."/>)}</div>,addMeeting,'Crear reunión')}
    {toast && <div className="toast-message">{toast}</div>}
  </div>
}
export default App
