import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, CheckCheck, ChevronRight, Building2, BriefcaseBusiness, UserPlus,
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
type OrgMember = { id: string; user_id: string | null; full_name: string; email: string | null; department: string; position: string; manager_user_id: string | null; is_org_admin: boolean; status: string; status_note: string; status_updated_at: string; last_seen_at?: string | null }
type OrgTask = { id: string; title: string; description: string; assigned_to: string; assigned_by: string; status: string; due_at: string | null; starts_at?: string | null; ends_at?: string | null }
const presenceClass = (status: string) => ({'Disponible':'available','Ocupado':'busy','En llamada':'call','Preparando pedido':'preparing','En instalación':'installation','Ausente':'away'} as Record<string,string>)[status] || 'offline'
const isMemberOnline = (member: OrgMember) => Boolean(member.last_seen_at && Date.now()-new Date(member.last_seen_at).getTime()<120000)
const ORG_DEPARTMENTS = ['Dirección','Administración','Departamento técnico','Comercial','RR. HH.']
const ORG_STATUSES = ['Disponible','Ocupado','En llamada','Preparando pedido','En instalación','Ausente']
const isCommercialMember = (member: OrgMember) => member.department === 'Comercial' || member.position.toLowerCase().includes('comercial')
const statusesForMember = (member: OrgMember) => ORG_STATUSES.filter(status => !isCommercialMember(member) || status !== 'Preparando pedido')
const DEMO_ORG_MEMBERS: OrgMember[] = [
 {id:'demo-german',user_id:null,full_name:'Germán',email:null,department:'Dirección',position:'Gerente',manager_user_id:null,is_org_admin:true,status:'Disponible',status_note:'Supervisión general y coordinación',status_updated_at:new Date().toISOString()},
 {id:'demo-gloria',user_id:null,full_name:'Gloria',email:null,department:'RR. HH.',position:'Recursos Humanos y Administración',manager_user_id:'demo-german',is_org_admin:false,status:'En llamada',status_note:'Gestión de personal',status_updated_at:new Date().toISOString()},
 {id:'demo-esther',user_id:null,full_name:'Esther',email:null,department:'Administración',position:'Administrativa',manager_user_id:'demo-gloria',is_org_admin:false,status:'Disponible',status_note:'Gestión administrativa',status_updated_at:new Date().toISOString()},
 {id:'demo-maria',user_id:null,full_name:'Maria',email:null,department:'Comercial',position:'Comercial',manager_user_id:'demo-german',is_org_admin:false,status:'En llamada',status_note:'Seguimiento de cliente',status_updated_at:new Date().toISOString()},
 {id:'demo-doribel',user_id:null,full_name:'Doribel',email:null,department:'Comercial',position:'Comercial',manager_user_id:'demo-german',is_org_admin:false,status:'Disponible',status_note:'Disponible para atender clientes',status_updated_at:new Date().toISOString()},
 {id:'demo-clara',user_id:null,full_name:'Clara',email:null,department:'Departamento técnico',position:'Coordinadora de servicio técnico',manager_user_id:'demo-german',is_org_admin:false,status:'Disponible',status_note:'Coordinación de intervenciones',status_updated_at:new Date().toISOString()},
 {id:'demo-gael',user_id:null,full_name:'Gael',email:null,department:'Departamento técnico',position:'Técnico',manager_user_id:'demo-clara',is_org_admin:false,status:'En instalación',status_note:'Instalación en cliente',status_updated_at:new Date().toISOString()},
 {id:'demo-daniel',user_id:null,full_name:'Daniel',email:null,department:'Departamento técnico',position:'Técnico',manager_user_id:'demo-clara',is_org_admin:false,status:'Preparando pedido',status_note:'Preparación de material',status_updated_at:new Date().toISOString()},
 {id:'demo-ricardo',user_id:null,full_name:'Ricardo',email:null,department:'Departamento técnico',position:'Técnico',manager_user_id:'demo-clara',is_org_admin:false,status:'Ausente',status_note:'Pausa',status_updated_at:new Date().toISOString()},
]
const DEMO_ORG_TASKS: OrgTask[] = [
 {id:'demo-task-1',title:'Preparar intervención técnica',description:'Revisar material y confirmar planificación',assigned_to:'demo-gael',assigned_by:'demo-clara',status:'En curso',due_at:new Date(new Date().setHours(11,0,0,0)).toISOString(),starts_at:new Date(new Date().setHours(9,0,0,0)).toISOString(),ends_at:new Date(new Date().setHours(11,0,0,0)).toISOString()},
 {id:'demo-task-2',title:'Coordinar agenda de técnicos',description:'Confirmar disponibilidad y desplazamientos',assigned_to:'demo-clara',assigned_by:'demo-german',status:'Pendiente',due_at:new Date(new Date().setHours(10,0,0,0)).toISOString(),starts_at:new Date(new Date().setHours(9,0,0,0)).toISOString(),ends_at:new Date(new Date().setHours(10,0,0,0)).toISOString()},
 {id:'demo-task-3',title:'Seguimiento de propuesta comercial',description:'Contactar con el cliente y actualizar propuesta',assigned_to:'demo-maria',assigned_by:'demo-german',status:'En curso',due_at:new Date(new Date().setHours(12,0,0,0)).toISOString(),starts_at:new Date(new Date().setHours(11,0,0,0)).toISOString(),ends_at:new Date(new Date().setHours(12,0,0,0)).toISOString()},
 {id:'demo-task-4',title:'Preparar documentación administrativa',description:'Revisar documentación pendiente',assigned_to:'demo-esther',assigned_by:'demo-gloria',status:'Pendiente',due_at:new Date(new Date().setHours(13,0,0,0)).toISOString(),starts_at:new Date(new Date().setHours(12,0,0,0)).toISOString(),ends_at:new Date(new Date().setHours(13,0,0,0)).toISOString()},
]
const STORE_KEY = 'executive-hub-v2'
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const localDateTime = (date: string, time: string) => date && time ? new Date(date + 'T' + time).toISOString() : ''
const dateInput = (value: string) => { if (!value) return ''; const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const timeInput = (value: string) => value ? new Date(value).toTimeString().slice(0, 5) : ''
const uid = () => crypto.randomUUID()

const renderAssistantInline = (value: string) =>
  value.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|__[^_]+__)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2,-2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1,-1)}</em>
    if (part.startsWith('__') && part.endsWith('__')) return <strong key={index}>{part.slice(2,-2)}</strong>
    return <span key={index}>{part.replace(/^\*+|\*+$/g,'')}</span>
  })

const renderAssistantMarkdown = (content: string) =>
  content.replace(/\r/g, '').split('\n').map((raw, index) => {
    const line = raw.trim()
    if (!line) return <div className="assistant-md-space" key={index}/>
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const Tag = heading[1].length === 1 ? 'h3' : 'h4'
      return <Tag className="assistant-md-heading" key={index}>{renderAssistantInline(heading[2])}</Tag>
    }
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) return <div className="assistant-md-list-item" key={index}><span>•</span><div>{renderAssistantInline(bullet[1])}</div></div>
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/)
    if (numbered) return <div className="assistant-md-list-item" key={index}><span>{numbered[1]}.</span><div>{renderAssistantInline(numbered[2])}</div></div>
    if (/^---+$/.test(line)) return <hr className="assistant-md-divider" key={index}/>
    return <p className="assistant-md-paragraph" key={index}>{renderAssistantInline(line)}</p>
  })

const seed: Store = {
  displayName: 'Germán', theme: 'light',
  tasks: [
    { id: uid(), title: 'Revisar propuesta comercial Q4', description: '', project: 'Dirección · Comercial', dueAt: localDateTime(today(), '12:30'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Validar presupuesto de tecnología', description: '', project: 'Finanzas · Operaciones', dueAt: localDateTime(today(), '15:00'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Enviar feedback a equipo de producto', description: '', project: 'Producto', dueAt: localDateTime(today(), '10:00'), priority: 'medium', status: 'in_progress', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Confirmar planificación de instalaciones', description: 'Coordinar técnicos, rutas y ventanas con clientes.', project: 'Departamento técnico', dueAt: localDateTime(today(), '11:00'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Revisar pedidos pendientes', description: 'Comprobar referencias y disponibilidad de material.', project: 'Administración · Técnico', dueAt: localDateTime(today(), '13:30'), priority: 'medium', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Llamar a cliente para seguimiento', description: 'Actualizar propuesta y próximos pasos.', project: 'Comercial', dueAt: localDateTime(today(), '16:00'), priority: 'medium', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Preparar documentación de personal', description: 'Revisar altas, turnos y documentación interna.', project: 'RR. HH.', dueAt: localDateTime(today(), '17:00'), priority: 'low', status: 'pending', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Cerrar informe semanal de servicio', description: 'Consolidar intervenciones y tiempos de respuesta.', project: 'Dirección · Técnico', dueAt: localDateTime(today(), '18:00'), priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
  ],
  events: [
    { id: uid(), title: 'Revisión de prioridades', description: 'Con dirección', location: 'Sala principal', startsAt: localDateTime(today(), '09:30'), endsAt: localDateTime(today(), '10:00'), type: 'meeting', allDay: false },
    { id: uid(), title: 'Bloque de trabajo estratégico', description: 'Planificación Q1', location: '', startsAt: localDateTime(today(), '11:00'), endsAt: localDateTime(today(), '12:30'), type: 'focus', allDay: false },
    { id: uid(), title: 'Seguimiento comercial', description: 'Con equipo comercial', location: 'Teams', startsAt: localDateTime(today(), '13:00'), endsAt: localDateTime(today(), '13:45'), type: 'meeting', allDay: false },
    { id: uid(), title: 'Reunión de coordinación técnica', description: 'Repaso de instalaciones y recursos.', location: 'Sala técnica', startsAt: localDateTime(today(), '10:30'), endsAt: localDateTime(today(), '11:00'), type: 'meeting', allDay: false },
    { id: uid(), title: 'Revisión de pedidos', description: 'Validación de material y fechas.', location: 'Administración', startsAt: localDateTime(today(), '12:00'), endsAt: localDateTime(today(), '12:30'), type: 'focus', allDay: false },
    { id: uid(), title: 'Llamadas comerciales', description: 'Seguimiento de oportunidades abiertas.', location: 'Teams', startsAt: localDateTime(today(), '15:00'), endsAt: localDateTime(today(), '15:45'), type: 'meeting', allDay: false },
    { id: uid(), title: 'Cierre operativo del día', description: 'Incidencias, entregas y planificación de mañana.', location: 'Sala principal', startsAt: localDateTime(today(), '17:30'), endsAt: localDateTime(today(), '18:00'), type: 'meeting', allDay: false },
  ],
  meetings: [
    { id: uid(), title: 'Comité de dirección', startsAt: localDateTime(today(), '09:30'), endsAt: localDateTime(today(), '10:00'), location: 'Sala principal', attendees: 'Dirección', summary: 'Revisión de prioridades y seguimiento de objetivos.', agreements: 'Validar prioridades del trimestre y revisar avances en la próxima reunión.' },
    { id: uid(), title: 'Coordinación de servicio técnico', startsAt: localDateTime(today(), '10:30'), endsAt: localDateTime(today(), '11:00'), location: 'Sala técnica', attendees: 'Clara, Gael, Daniel y Ricardo', summary: 'Revisión de instalaciones, incidencias abiertas y disponibilidad de técnicos.', agreements: 'Confirmar rutas, material necesario y responsable de cada intervención.' },
    { id: uid(), title: 'Seguimiento comercial', startsAt: localDateTime(today(), '15:00'), endsAt: localDateTime(today(), '15:45'), location: 'Microsoft Teams', attendees: 'Germán, María y Doribel', summary: 'Repaso de oportunidades, propuestas enviadas y clientes pendientes.', agreements: 'Actualizar CRM y fijar fecha de próximo contacto para cada oportunidad.' },
    { id: uid(), title: 'Administración y personas', startsAt: localDateTime(today(), '16:00'), endsAt: localDateTime(today(), '16:30'), location: 'Sala de reuniones', attendees: 'Germán, Gloria y Esther', summary: 'Revisión de documentación, planificación y necesidades de personal.', agreements: 'Consolidar documentación pendiente y compartir calendario de ausencias.' },
  ],
  notes: [
    { id: uid(), title: 'Ideas para Q1', content: 'Revisar objetivos estratégicos, presupuesto y capacidad del equipo.', pinned: true, updatedAt: new Date().toISOString() },
    { id: uid(), title: 'Plan operativo del departamento técnico', content: 'Prioridades: planificación de instalaciones, preparación de material, asignación de técnicos y cierre de partes. Clara coordina el servicio técnico.', pinned: true, updatedAt: new Date().toISOString() },
    { id: uid(), title: 'Seguimiento comercial Q4', content: 'María y Doribel mantienen el seguimiento de propuestas y clientes. Revisar oportunidades abiertas y próximos contactos.', pinned: false, updatedAt: new Date().toISOString() },
    { id: uid(), title: 'Procesos de administración y RR. HH.', content: 'Gloria coordina Recursos Humanos y Administración. Esther da soporte a la gestión administrativa y documentación.', pinned: false, updatedAt: new Date().toISOString() },
    { id: uid(), title: 'Indicadores de servicio', content: 'Revisar intervenciones completadas, tiempos de respuesta, desplazamientos, incidencias reabiertas y satisfacción del cliente.', pinned: false, updatedAt: new Date().toISOString() },
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

function buildAssistantAnswer(question: string, store: Store): string {
  const q = question.toLocaleLowerCase('es').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  const now = new Date()
  const key = today()
  const open = store.tasks.filter(t => t.status !== 'completed')
  const completed = store.tasks.filter(t => t.status === 'completed')
  const high = open.filter(t => t.priority === 'high')
  const overdue = open.filter(t => t.dueAt && dateInput(t.dueAt) < key).sort((a,b) => a.dueAt.localeCompare(b.dueAt))
  const todayTasks = open.filter(t => t.dueAt && dateInput(t.dueAt) === key)
  const upcomingTasks = open.filter(t => t.dueAt && dateInput(t.dueAt) > key).sort((a,b) => a.dueAt.localeCompare(b.dueAt))
  const events = store.events.filter(e => dateInput(e.startsAt) >= key).sort((a,b) => a.startsAt.localeCompare(b.startsAt))
  const todaysEvents = events.filter(e => dateInput(e.startsAt) === key)
  const nextEvents = events.slice(0,5)
  const pct = store.tasks.length ? Math.round(completed.length / store.tasks.length * 100) : 0
  const list = (items: Task[]) => items.length ? items.slice(0,5).map(t => '• ' + t.title + (t.dueAt ? ' · ' + fmtDate(t.dueAt) : '') + ' · ' + priorityLabel(t.priority)).join('\\n') : 'No hay elementos en esta categoría.'
  const eventList = (items: EventItem[]) => items.length ? items.slice(0,5).map(e => '• ' + fmtTime(e.startsAt) + ' · ' + e.title + (e.location ? ' — ' + e.location : '')).join('\\n') : 'No tienes eventos en este periodo.'
  const noteMatches = store.notes.filter(n => (n.title + ' ' + n.content).toLocaleLowerCase('es').includes(q.replace(/^(busca|buscar|encuentra|encontrar)\\s+/,'')))
  const projectNames = [...new Set(open.map(t => t.project).filter(Boolean))]
  if (/^(hola|buenos dias|buenas|buenas tardes|que tal)/.test(q)) return '¡Hola! Soy tu copiloto de dirección. Puedo analizar tu carga de trabajo, detectar riesgos, preparar reuniones, localizar información y ayudarte a convertir ideas en tareas.\\n\\nPrueba: «¿Qué debería priorizar?», «¿Qué tengo esta semana?» o «Prepara el comité de dirección».'
  if (q.includes('prior') || q.includes('por donde empiezo') || q.includes('que hago primero') || q.includes('que deberia hacer')) {
    const lines = ['RECOMENDACIÓN DE PRIORIDADES', '']
    if (overdue.length) lines.push('1. Resolver vencimientos (' + overdue.length + ')', list(overdue), '')
    if (high.length) lines.push((overdue.length ? '2.' : '1.') + ' Proteger las tareas de prioridad alta (' + high.length + ')', list(high), '')
    if (!overdue.length && !high.length) lines.push('No hay vencimientos ni prioridades altas. Mantén el foco en las tareas con fecha más próxima.', list(upcomingTasks), '')
    lines.push('Criterio: primero compromisos vencidos, después impacto alto y, por último, tareas próximas. Evita abrir más de tres frentes a la vez.')
    return lines.join('\\n')
  }
  if (q.includes('brief') || q.includes('resumen') || q.includes('mi dia') || q.includes('mi jornada') || q.includes('como voy')) {
    return 'BRIEFING EJECUTIVO · ' + new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(now) + '\\n\\nAGENDA\\n' + eventList(todaysEvents) + '\\n\\nCARGA DE TRABAJO\\n' + open.length + ' tareas abiertas · ' + high.length + ' prioritarias · ' + overdue.length + ' vencidas · ' + pct + '% completado.\\n\\nFOCO RECOMENDADO\\n' + (overdue.length ? 'Desbloquea primero «' + overdue[0].title + '». ' : '') + (high.length ? 'Después avanza «' + high[0].title + '».' : 'No hay tareas de prioridad alta pendientes.') + '\\n\\nCONSEJO\\nReserva un bloque sin interrupciones para el trabajo de mayor impacto.'
  }
  if (q.includes('agenda') || q.includes('calendario') || q.includes('esta semana') || q.includes('proximos eventos') || q.includes('proxima reunion')) {
    return 'AGENDA PRÓXIMA\\n\\n' + eventList(nextEvents) + '\\n\\nHay ' + events.length + ' compromisos futuros registrados. Comprueba que cada reunión tenga objetivo, asistentes y resultado esperado.'
  }
  if (q.includes('reunion') || q.includes('comite') || q.includes('prepara') && (q.includes('junta') || q.includes('encuentro'))) {
    const matches = store.meetings.filter(m => q.includes('comite') ? m.title.toLowerCase().includes('comite') : true).sort((a,b) => a.startsAt.localeCompare(b.startsAt))
    if (!matches.length) return 'No encuentro reuniones registradas que pueda preparar. Crea una en el apartado Reuniones y añade asistentes, contexto y acuerdos.'
    return 'PREPARACIÓN DE REUNIONES\\n\\n' + matches.slice(0,3).map(m => '• ' + m.title + ' · ' + fmtDate(m.startsAt) + ' ' + fmtTime(m.startsAt) + '\\n  Asistentes: ' + (m.attendees || 'Pendiente de indicar') + '\\n  Contexto: ' + (m.summary || 'Sin acta o contexto') + '\\n  Acuerdos: ' + (m.agreements || 'Pendientes de registrar')).join('\\n\\n') + '\\n\\nANTES DE ENTRAR\\n1. Define la decisión que debe salir de la reunión.\\n2. Identifica los puntos bloqueados.\\n3. Cierra cada acuerdo con responsable y fecha.'
  }
  if (q.includes('vencid') || q.includes('atras') || q.includes('retras')) return 'TAREAS VENCIDAS\\n\\n' + list(overdue) + '\\n\\nRecomendación: confirma si siguen vigentes, renegocia su fecha o ciérralas. Una tarea vencida sin responsable ni siguiente paso es un riesgo de seguimiento.'
  if (q.includes('tarea') || q.includes('pendiente') || q.includes('trabajo') || q.includes('proyecto')) {
    if (q.includes('complet')) return 'PROGRESO\\n\\n' + completed.length + ' de ' + store.tasks.length + ' tareas completadas (' + pct + '%).\\n\\n' + (completed.length ? completed.slice(0,5).map(t => '• ' + t.title).join('\\n') : 'Todavía no hay tareas completadas.')
    if (q.includes('proyecto') && projectNames.length) return 'CARGA POR ÁREA\\n\\n' + projectNames.map(p => '• ' + p + ': ' + open.filter(t => t.project === p).length + ' abiertas').join('\\n') + '\\n\\nAbiertas: ' + open.length + ' · Vencidas: ' + overdue.length + '.'
    return 'TAREAS ABIERTAS\\n\\n' + list(open) + '\\n\\nVencidas: ' + overdue.length + ' · Para hoy: ' + todayTasks.length + ' · Próximas: ' + upcomingTasks.length + '.'
  }
  if (q.includes('nota') || q.includes('busca') || q.includes('buscar') || q.includes('encuentra')) {
    return noteMatches.length ? 'HE ENCONTRADO ' + noteMatches.length + ' NOTA(S)\\n\\n' + noteMatches.slice(0,5).map(n => '• ' + n.title + '\\n  ' + n.content.slice(0,260)).join('\\n\\n') : 'No encuentro coincidencias en tus notas. Prueba con una palabra clave más concreta o revisa el apartado Notas.'
  }
  if (q.includes('ayuda') || q.includes('puedes hacer') || q.includes('que sabes hacer')) return 'PUEDO AYUDARTE CON\\n\\n• Briefing: agenda, carga y foco del día.\\n• Prioridades: vencimientos e impacto.\\n• Reuniones: contexto, asistentes y acuerdos registrados.\\n• Seguimiento: tareas abiertas, completadas y por área.\\n• Búsqueda: localizar notas por palabras clave.\\n• Acción: crear una tarea escribiendo «añade tarea: preparar informe».\\n\\nTrabajo con los datos guardados en este navegador. No envío información a servicios externos.'
  return 'Puedo ayudarte a tomar decisiones sobre la información de EXECUTIVE HUB.\\n\\nPara darte una respuesta útil, prueba a concretar: «¿Qué debería priorizar?», «¿Qué tareas están vencidas?», «¿Qué reuniones tengo?» o «Busca la nota presupuesto». También puedes pedirme que cree una tarea: «Añade tarea: revisar propuesta comercial».'
}

function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [active, setActive] = useState('Resumen')
  const [orgView, setOrgView] = useState<'home'|'chart'|'team'|'tasks'|'department'>('home')
  const [orgDepartment, setOrgDepartment] = useState('Departamento técnico')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [presenceMenuOpen, setPresenceMenuOpen] = useState(false)
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
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<{role:'user'|'assistant';content:string}[]>([])
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantError, setAssistantError] = useState('')
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [guestMode, setGuestMode] = useState(false)
  const [guestSessionId, setGuestSessionId] = useState('')
  const [cloudReady,setCloudReady] = useState(false)
  const [cloudError,setCloudError] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [authDepartment, setAuthDepartment] = useState('Departamento técnico')
  const [authPosition, setAuthPosition] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [orgTasks, setOrgTasks] = useState<OrgTask[]>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgProfileDraft, setOrgProfileDraft] = useState({full_name:'',department:'Departamento técnico',position:''})
  const [orgTaskDrafts, setOrgTaskDrafts] = useState<Record<string,{title:string;description:string;due_at:string;starts_at:string;ends_at:string}>>({})
  const [selectedOrgPerson, setSelectedOrgPerson] = useState<OrgMember | null>(null)

  useEffect(() => { if (!supabase) return; let alive = true; supabase.auth.getSession().then(({data}) => { if (alive) setAuthSession(data.session) }); const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => { setCloudReady(false); setAuthSession(session) }); return () => { alive=false; subscription.unsubscribe() } }, [])
  useEffect(() => {
    if (!supabase || !authSession) { setCloudReady(false); return }
    let alive = true
    const client = supabase as any
    const userId = authSession.user.id
    const guest = Boolean(authSession.user.is_anonymous)
    const load = async () => {
      try {
        const [profileRes,tasksRes,eventsRes,meetingsRes,notesRes] = await Promise.all([
          client.from('profiles').select('*').eq('id',userId).maybeSingle(),
          client.from('tasks').select('*').eq('user_id',userId),
          client.from('calendar_events').select('*').eq('user_id',userId),
          client.from('meetings').select('*').eq('user_id',userId),
          client.from('notes').select('*').eq('user_id',userId),
        ])
        for (const result of [profileRes,tasksRes,eventsRes,meetingsRes,notesRes]) if (result.error) throw result.error
        const displayName = profileRes.data?.display_name || authSession.user.user_metadata?.display_name || 'Germán'
        const hasCloudData = tasksRes.data.length + eventsRes.data.length + meetingsRes.data.length + notesRes.data.length > 0
        const nextStore: Store = hasCloudData || !guest ? {
          displayName, theme: profileRes.data?.theme === 'dark' ? 'dark' : 'light',
          tasks: (tasksRes.data || []).map((t:any)=>({id:t.id,title:t.title,description:t.description||'',project:t.project||'',dueAt:t.due_at||'',priority:t.priority,status:t.status,createdAt:t.created_at})),
          events: (eventsRes.data || []).map((e:any)=>({id:e.id,title:e.title,description:e.description||'',location:e.location||'',startsAt:e.starts_at,endsAt:e.ends_at,type:e.event_type,allDay:e.all_day})),
          meetings: (meetingsRes.data || []).map((m:any)=>({id:m.id,title:m.title,startsAt:m.starts_at||'',endsAt:m.ends_at||'',location:m.location||'',attendees:m.attendees||'',summary:m.summary||'',agreements:m.agreements||''})),
          notes: (notesRes.data || []).map((n:any)=>({id:n.id,title:n.title,content:n.content,pinned:n.pinned,updatedAt:n.updated_at})),
        } : {...seed,displayName:'Germán'}
        const {error:profileError}=await client.from('profiles').upsert({id:userId,display_name:displayName,theme:nextStore.theme,timezone:'Europe/Madrid'},{onConflict:'id'})
        if(profileError) throw profileError
        if (alive) { setStore(nextStore); setSettingsName(nextStore.displayName); setSettingsTheme(nextStore.theme); setCloudReady(true) }
      } catch (error) { if(alive) { setCloudError(error instanceof Error ? error.message : 'No se han podido cargar los datos'); setCloudReady(false) } }
    }
    void load()
    return () => { alive=false }
  }, [authSession?.user.id])
  useEffect(() => {
    if (!supabase || !authSession || authSession.user.is_anonymous) return
    const channel = (supabase as any).channel('organization-presence-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'organization_members'},(payload:any)=>{
        if(payload.eventType==='DELETE') setOrgMembers(current=>current.filter(member=>member.id!==payload.old.id))
        else if(payload.new) setOrgMembers(current=>{
          const exists=current.some(member=>member.id===payload.new.id)
          return exists?current.map(member=>member.id===payload.new.id?{...member,...payload.new}:member):[...current,payload.new as OrgMember]
        })
      }).subscribe()
    return ()=>{(supabase as any).removeChannel(channel)}
  },[authSession?.user.id])
  useEffect(() => {
    if (!supabase || !authSession || authSession.user.is_anonymous) return
    const userId=authSession.user.id
    const touch=async()=>{await (supabase as any).from('organization_members').update({last_seen_at:new Date().toISOString()}).eq('user_id',userId)}
    void touch()
    const timer=window.setInterval(()=>{void touch()},45000)
    return ()=>window.clearInterval(timer)
  },[authSession?.user.id])
  useEffect(() => {
    if (!supabase || !authSession || authSession.user.is_anonymous) { setOrgMembers([]); setOrgTasks([]); return }
    let alive = true
    const userId = authSession.user.id
    const guest = Boolean(authSession.user.is_anonymous)
    setOrgLoading(true)
    const client = supabase as any
    Promise.all([
      client.from('organization_members').select('*').order('department').order('full_name'),
      client.from('organization_tasks').select('*').order('created_at',{ascending:false}),
    ]).then(async ([members,tasks]) => {
      if (!alive) return
      if (members.error || tasks.error) { setCloudError(members.error?.message || tasks.error?.message || 'No se ha podido cargar la organización'); return }
      let companyMembers = members.data || []
      const metadata = authSession.user.user_metadata || {}
      const hasEmployeeData = Boolean(metadata.full_name && metadata.department && metadata.position)
      const ownProfile = companyMembers.find((member:any) => member.user_id === userId)
      if (!guest && !ownProfile && hasEmployeeData) {
        const {data:newMember,error:createError} = await client.from('organization_members').insert({
          user_id:userId, full_name:String(metadata.full_name).trim(), email:authSession.user.email || null,
          department:metadata.department, position:String(metadata.position).trim(), status:'Disponible',last_seen_at:new Date().toISOString()
        }).select().single()
        if (createError) { setCloudError(createError.message); return }
        companyMembers = [...companyMembers,newMember]
      }
      if (alive) {
        setOrgMembers(companyMembers)
        setOrgTasks(tasks.data || [])
      }
    }).catch(error => { if(alive) setCloudError(error instanceof Error ? error.message : 'No se ha podido cargar la organización') })
      .finally(() => { if(alive) setOrgLoading(false) })
    return () => { alive = false }
  }, [authSession?.user.id])
  useEffect(() => {
    if (!supabase || !authSession || !cloudReady) return
    const client = supabase as any
    const userId = authSession.user.id
    const timer = window.setTimeout(async () => {
      try {
        const operations = [
          ['tasks',store.tasks.map(t=>({id:t.id,user_id:userId,title:t.title,description:t.description,project:t.project,priority:t.priority,status:t.status,due_at:t.dueAt||null,created_at:t.createdAt||new Date().toISOString()}))],
          ['calendar_events',store.events.map(e=>({id:e.id,user_id:userId,title:e.title,description:e.description,location:e.location,starts_at:e.startsAt,ends_at:e.endsAt,all_day:e.allDay,event_type:e.type}))],
          ['meetings',store.meetings.map(m=>({id:m.id,user_id:userId,title:m.title,starts_at:m.startsAt||null,ends_at:m.endsAt||null,location:m.location,attendees:m.attendees,summary:m.summary,agreements:m.agreements||''}))],
          ['notes',store.notes.map(n=>({id:n.id,user_id:userId,title:n.title,content:n.content,pinned:n.pinned,updated_at:n.updatedAt||new Date().toISOString()}))],
        ] as [string,any[]][]
        for (const [table,rows] of operations) {
          if (rows.length) { const {error}=await client.from(table).upsert(rows,{onConflict:'id'}); if(error) throw error }
          const ids=rows.map(row=>row.id)
          let deletion=client.from(table).delete().eq('user_id',userId)
          if(ids.length) deletion=deletion.not('id','in',`(${ids.join(',')})`)
          const {error}=await deletion
          if(error) throw error
        }
        const {error:profileError}=await client.from('profiles').upsert({id:userId,display_name:store.displayName||'Germán',theme:store.theme,timezone:'Europe/Madrid'},{onConflict:'id'})
        if(profileError) throw profileError
        setCloudError('')
      } catch(error) { setCloudError(error instanceof Error ? error.message : 'No se han podido sincronizar los cambios') }
    },500)
    return () => window.clearTimeout(timer)
  }, [store,authSession?.user.id,cloudReady])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer) } }, [toast])
  useEffect(() => { document.documentElement.style.colorScheme = store.theme }, [store.theme])
  useEffect(() => {
    const viewport = window.visualViewport
    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight
      const offset = viewport?.offsetTop ?? 0
      document.documentElement.style.setProperty('--eh-viewport-height', height + 'px')
      document.documentElement.style.setProperty('--eh-viewport-top', offset + 'px')
    }
    syncViewport()
    viewport?.addEventListener('resize', syncViewport)
    viewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      viewport?.removeEventListener('resize', syncViewport)
      viewport?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        window.setTimeout(() => document.querySelector<HTMLInputElement>('.search-box input')?.focus(), 0)
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
  const nav = [
    { label: 'Resumen', icon: LayoutDashboard }, { label: 'Agenda', icon: CalendarDays },
    { label: 'Tareas', icon: CheckCheck }, { label: 'Reuniones', icon: Users },
    { label: 'Mi organización', icon: Building2 }, { label: 'Notas', icon: FileText }, { label: 'Asistente', icon: Sparkles },
  ]
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    if (!q) return []
    const sections = [
      ...nav,
      { label: 'Preferencias', icon: Settings2 },
    ]
    return sections
      .filter(section => section.label.toLocaleLowerCase('es').includes(q))
      .map(section => ({ label: section.label, detail: 'Sección de EXECUTIVE HUB', go: section.label }))
  }, [query])
  const displayOrgMembers = orgMembers
  const displayOrgTasks = orgTasks
  const myOrgMember = guestMode ? orgMembers.find(member => member.id === 'demo-german') : orgMembers.find(member => member.user_id === authSession?.user.id)
  const canManageOrg = guestMode || Boolean(myOrgMember?.is_org_admin)
  const canManageMember = (member: OrgMember) => guestMode || canManageOrg || member.manager_user_id === authSession?.user.id
  const registerOrgProfile = async () => {
    if (!supabase || !authSession || authSession.user.is_anonymous) return
    const {error} = await (supabase as any).from('organization_members').insert({
      user_id: authSession.user.id, full_name: orgProfileDraft.full_name.trim() || store.displayName,
      department: orgProfileDraft.department, position: orgProfileDraft.position.trim(), status:'Disponible',last_seen_at:new Date().toISOString()
    })
    if (error) { setToast(error.message); return }
    setToast('Perfil organizativo creado')
    const {data} = await (supabase as any).from('organization_members').select('*').order('department').order('full_name')
    setOrgMembers(data || [])
  }
  const updateOrgManager = async (member: OrgMember, manager_user_id: string) => {
    if (!canManageOrg || member.id === myOrgMember?.id) return
    if (guestMode) {
      setOrgMembers(current => current.map(item => item.id===member.id ? {...item,manager_user_id:manager_user_id || null} : item))
      setToast('Responsable actualizado en la demo')
      return
    }
    if (!supabase) return
    const {error} = await (supabase as any).from('organization_members').update({manager_user_id:manager_user_id || null}).eq('id',member.id)
    if (error) { setToast(error.message); return }
    setOrgMembers(current => current.map(item => item.id===member.id ? {...item,manager_user_id:manager_user_id || null} : item))
    setToast('Responsable actualizado')
  }
  const updateMemberStatus = async (member: OrgMember,status: string,status_note = member.status_note) => {
    const updatedAt = new Date().toISOString()
    if (guestMode) {
      setOrgMembers(current => current.map(item => item.id===member.id ? {...item,status,status_note,status_updated_at:updatedAt,last_seen_at:updatedAt} : item))
      return
    }
    if (!supabase || !(member.user_id === authSession?.user.id || canManageMember(member))) return
    const {error} = await (supabase as any).from('organization_members').update({status,status_note,status_updated_at:updatedAt,last_seen_at:updatedAt}).eq('id',member.id)
    if (error) { setToast(error.message); return }
    setOrgMembers(current => current.map(item => item.id===member.id ? {...item,status,status_note,status_updated_at:updatedAt} : item))
  }
  const updateMyOrgStatus = async (status: string, status_note = '') => {
    if (!myOrgMember) return
    await updateMemberStatus(myOrgMember,status,status_note)
  }
  const assignOrgTask = async (member: OrgMember): Promise<boolean> => {
    if (!canManageMember(member) || (!guestMode && (!supabase || !authSession || !member.user_id))) return false
    const draft = orgTaskDrafts[member.id] || {title:'',description:'',due_at:'',starts_at:'',ends_at:''}
    if (!draft.title.trim() || !draft.due_at || !draft.starts_at || !draft.ends_at) { setToast('Indica título, fecha, hora de inicio y hora de fin'); return false }
    const startAt = new Date(draft.due_at+'T'+draft.starts_at).toISOString()
    const endAt = new Date(draft.due_at+'T'+draft.ends_at).toISOString()
    if (new Date(endAt) <= new Date(startAt)) { setToast('La hora de fin debe ser posterior a la de inicio'); return false }
    const overlaps = displayOrgTasks.find(task => {
      if (task.assigned_to !== (guestMode ? member.id : member.user_id) || task.status === 'Completada') return false
      const oldStart = task.starts_at || task.due_at
      const oldEnd = task.ends_at || (oldStart ? new Date(new Date(oldStart).getTime()+60*60*1000).toISOString() : null)
      return Boolean(oldStart && oldEnd && new Date(startAt)<new Date(oldEnd) && new Date(endAt)>new Date(oldStart))
    })
    if (overlaps) {
      const conflictStart = overlaps.starts_at || overlaps.due_at
      const conflictEnd = overlaps.ends_at || (conflictStart ? new Date(new Date(conflictStart).getTime()+60*60*1000).toISOString() : null)
      setToast('No se puede asignar: '+member.full_name+' ya tiene «'+overlaps.title+'» de '+fmtTime(conflictStart||'')+' a '+fmtTime(conflictEnd||'')+' ese día.')
      return false
    }
    if (guestMode) {
      const demoTask: OrgTask = {id:uid(),title:draft.title.trim(),description:draft.description.trim(),assigned_to:member.id,assigned_by:'demo-german',status:'Pendiente',due_at:endAt,starts_at:startAt,ends_at:endAt}
      setOrgTasks(current => [demoTask,...current])
    } else {
      const {data,error} = await (supabase as any).from('organization_tasks').insert({
        title:draft.title.trim(),description:draft.description.trim(),assigned_to:member.user_id,
        assigned_by:authSession!.user.id,due_at:endAt,starts_at:startAt,ends_at:endAt
      }).select().single()
      if (error) { setToast(error.message); return false }
      setOrgTasks(current => [data,...current])
    }
    setOrgTaskDrafts(current => ({...current,[member.id]:{title:'',description:'',due_at:'',starts_at:'',ends_at:''}}))
    setToast('Tarea asignada')
    return true
  }
  const updateOrgTaskStatus = async (task: OrgTask,status: string) => {
    if (guestMode) {
      setOrgTasks(current => current.map(item => item.id===task.id ? {...item,status} : item))
      return
    }
    if (!supabase) return
    const {error} = await (supabase as any).from('organization_tasks').update({status,updated_at:new Date().toISOString()}).eq('id',task.id)
    if (error) { setToast(error.message); return }
    setOrgTasks(current => current.map(item => item.id===task.id ? {...item,status} : item))
  }
  const openTaskEditor = (task?: Task) => { setEditingTaskId(task?.id || null); setTaskDraft(task ? { title: task.title, description: task.description, project: task.project, dueDate: dateInput(task.dueAt), dueTime: timeInput(task.dueAt), priority: task.priority } : blankTask()); setTaskForm(true) }
  const addTask = () => {
    if (!taskDraft.title.trim()) return
    const existing = tasks.find(t => t.id === editingTaskId)
    const item: Task = { id: editingTaskId || uid(), title: taskDraft.title.trim(), description: taskDraft.description, project: taskDraft.project || 'General', dueAt: localDateTime(taskDraft.dueDate, taskDraft.dueTime), priority: taskDraft.priority, status: existing?.status || 'pending', createdAt: existing?.createdAt || new Date().toISOString() }
    save({ ...store, tasks: editingTaskId ? tasks.map(t => t.id === editingTaskId ? item : t) : [item, ...tasks] }); setTaskForm(false); setEditingTaskId(null); setTaskDraft(blankTask()); setToast(editingTaskId ? 'Tarea actualizada' : 'Tarea creada')
  }
  const submitAssistantQuestion = async (question: string) => {
    const q = question.trim()
    if (!q || assistantLoading) return
    if (!supabase || (!authSession && !guestMode)) { setAssistantError('La sesión del asistente no está disponible.'); return }
    const nextMessages = [...assistantMessages, { role: 'user' as const, content: q }]
    setAssistantMessages(nextMessages)
    setAssistantQuestion('')
    setAssistantError('')
    setAssistantLoading(true)
    const context = {
      date: today(),
      tasks: store.tasks.map(t => ({ title:t.title, description:t.description, project:t.project, dueAt:t.dueAt, priority:t.priority, status:t.status })),
      events: store.events.map(e => ({ title:e.title, description:e.description, location:e.location, startsAt:e.startsAt, endsAt:e.endsAt, type:e.type })),
      meetings: store.meetings.map(m => ({ title:m.title, startsAt:m.startsAt, endsAt:m.endsAt, location:m.location, attendees:m.attendees, summary:m.summary, agreements:m.agreements })),
      notes: store.notes.map(n => ({ title:n.title, content:n.content, pinned:n.pinned })),
    }
    try {
      const {data,error} = await supabase.functions.invoke('executive-copilot',{body:{messages:nextMessages,context},headers:guestMode ? {'x-guest-session':guestSessionId} : {}})
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const answer = String(data?.answer || '').trim()
      if (!answer) throw new Error('El modelo no ha devuelto una respuesta.')
      setAssistantMessages([...nextMessages,{role:'assistant',content:answer}])
    } catch (error) {
      let message = error instanceof Error ? error.message : 'No se ha podido conectar con el asistente.'
      const context = (error as { context?: Response })?.context
      if (context && typeof context.json === 'function') { try { const payload = await context.json(); if (payload?.error) message = payload.error } catch { /* use original message */ } }
      setAssistantError(message)
    } finally { setAssistantLoading(false) }
  }
  const signInApp = async () => {
    if (!supabase || !authEmail.trim() || !authPassword) return
    setGuestMode(false)
    setAuthLoading(true); setAssistantError('')
    try {
      if (authMode === 'signup') {
        const {error} = await supabase.auth.signUp({email:authEmail.trim(),password:authPassword,options:{data:{display_name:authFullName.trim(),full_name:authFullName.trim(),department:authDepartment,position:authPosition.trim()}}})
        if (error) throw error
        setAssistantError('Cuenta creada. Si la confirmación por correo está activada, revisa tu bandeja de entrada y confirma el registro.')
      } else {
        const {error} = await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword})
        if (error) throw error
      }
    } catch(error) { setAssistantError(error instanceof Error ? error.message : 'No se ha podido iniciar sesión.') }
    finally { setAuthLoading(false) }
  }
  const signOutApp = async () => { if(supabase && authSession) { await (supabase as any).from('organization_members').update({last_seen_at:null}).eq('user_id',authSession.user.id); await supabase.auth.signOut() } setPresenceMenuOpen(false); setGuestMode(false); setGuestSessionId(''); setOrgMembers([]); setOrgTasks([]); setAssistantMessages([]); setAssistantError(''); setStore({...seed,displayName:'Germán'}); setSettingsName('Germán'); setCloudReady(false) }
  const enterAsGuest = () => { setOrgMembers(DEMO_ORG_MEMBERS.map(member=>({...member,last_seen_at:new Date().toISOString()}))); setOrgTasks(DEMO_ORG_TASKS.map(task=>({...task}))); setGuestSessionId(crypto.randomUUID()); setGuestMode(true); setAuthSession(null); setCloudReady(false); setCloudError(''); setStore({...seed,displayName:'Germán'}); setSettingsName('Germán'); setSettingsTheme('light'); setAssistantMessages([]); setAssistantError(''); setActive('Resumen') }
    const toggleTask = (id: string) => { const task=tasks.find(t=>t.id===id); if(!task)return; save({ ...store, tasks: tasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t) }); setToast(task.status === 'completed' ? 'Tarea reabierta' : 'Tarea completada') };
   const changeTaskPriority = (id:string, priority:Priority) => save({...store,tasks:tasks.map(t=>t.id===id?{...t,priority}:t)})
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
  const modal = (title: string, close: () => void, body: React.ReactNode, submit: () => void, submitLabel: string) => <div className="modal-backdrop" onClick={close}><div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">EXECUTIVE HUB</span><h2 id="dialog-title">{title}</h2></div></div>{body}<div className="modal-actions"><button className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" onClick={submit}><Save size={14}/>{submitLabel}</button></div></div></div>;

  if (isSupabaseConfigured && supabase && !authSession && !guestMode) return <div className="app-shell"><main className="main-area" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><section className="panel assistant-auth" style={{width:'min(440px,100%)'}}><div className="brand" style={{marginBottom:28}}><div className="brand-mark"><Command size={19}/></div><div><strong>EXECUTIVE<span>HUB</span></strong><small>YOUR DAY. UNDER CONTROL.</small></div></div><div className="eyebrow">ACCESO AL WORKSPACE</div><h1 style={{margin:'10px 0'}}>Tu espacio de dirección.</h1><p>Inicia sesión para acceder a EXECUTIVE HUB y a todas sus herramientas, incluido EXECUTIVE COPILOT.</p><form onSubmit={e=>{e.preventDefault();signInApp()}} className="assistant-auth-form">{authMode==='signup'&&<><input type="text" autoComplete="name" required value={authFullName} onChange={e=>setAuthFullName(e.target.value)} placeholder="Nombre y apellidos"/><select required value={authDepartment} onChange={e=>setAuthDepartment(e.target.value)}>{ORG_DEPARTMENTS.map(department=><option key={department} value={department}>{department}</option>)}</select><input type="text" required value={authPosition} onChange={e=>setAuthPosition(e.target.value)} placeholder="Puesto en la empresa"/></>}<input type="email" autoComplete="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Correo corporativo"/><input type="password" autoComplete={authMode==='signup'?'new-password':'current-password'} required minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Contraseña (mín. 8 caracteres)"/><button className="primary-button" disabled={authLoading|| (authMode==='signup'&&(!authFullName.trim()||!authPosition.trim()))}>{authLoading?'Accediendo…':authMode==='login'?'Iniciar sesión':'Crear cuenta corporativa'}</button></form><button className="text-button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAssistantError('')}}>{authMode==='login'?'¿No tienes cuenta? Crear cuenta':'Ya tengo cuenta · Iniciar sesión'}</button><button className="secondary-button" style={{width:'100%',marginTop:12}} disabled={authLoading} onClick={enterAsGuest}>Entrar como invitado</button>{assistantError&&<p className="assistant-error">{assistantError}</p>}</section></main></div>;
  if (authSession && !cloudReady) return <div className="app-shell"><main className="main-area" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><section className="panel assistant-auth"><strong>Preparando tu workspace…</strong><p>Conectando tu sesión y cargando tus datos.</p>{cloudError&&<p className="assistant-error">{cloudError}</p>}<button className="text-button" onClick={signOutApp}>Cerrar sesión</button></section></main></div>;
  if (!isSupabaseConfigured || !supabase) return <div className="app-shell"><main className="main-area" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><section className="panel assistant-auth"><strong>Configuración pendiente</strong><p>EXECUTIVE HUB no puede iniciar el acceso seguro porque falta la configuración de Supabase.</p></section></main></div>;
  return <div className={`app-shell ${store.theme === 'dark' ? 'dark' : ''}`}>
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Command size={19}/></div><div><strong>EXECUTIVE<span>HUB</span></strong><small>PERSONAL WORKSPACE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'selected' : ''}`} onClick={() => setPage(item.label)}><Icon size={18}/><span>{item.label}</span>{item.label === 'Tareas' && <em>{pending}</em>}</button> })}</nav>
      <div className="sidebar-bottom">
        <button className={`nav-item ${active === 'Preferencias' ? 'selected' : ''}`} onClick={() => setPage('Preferencias')}><Settings2 size={18}/><span>Preferencias</span></button>
        <div className="profile"><div className="avatar">{store.displayName.slice(0,2).toUpperCase()}</div><div className="profile-info"><strong>{store.displayName}</strong><small>{guestMode?'Sesión de invitado · Temporal':'Cuenta registrada'}</small></div><button className="icon-button" title="Cerrar sesión" onClick={signOutApp}><LogOut size={16}/></button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><button className="icon-button" aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><strong>EXECUTIVE<span>HUB</span></strong></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="top-actions"><div className="search-box"><Search size={16}/><input aria-label="Buscar en el workspace" value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setSearchOpen(true)}} onKeyDown={e=>{if(e.key==='Escape'){setSearchOpen(false);setQuery('')} if(e.key==='Enter'&&results[0]){setPage(results[0].go);setSearchOpen(false)}}} placeholder="Buscar..."/><kbd>⌘ K</kbd>{searchOpen && query.trim() && <div className="search-panel">{results.length ? results.map((r,i)=><button key={i} onClick={()=>setPage(r.go)}><span>{r.label}</span><small>{r.detail}</small></button>) : <p>No hay resultados.</p>}</div>}</div><div className="presence-control"><button className="presence-trigger" aria-expanded={presenceMenuOpen} onClick={()=>setPresenceMenuOpen(value=>!value)} disabled={!myOrgMember&&!guestMode}><span>Estado</span><i className={'presence-dot '+(guestMode?presenceClass(myOrgMember?.status||'Disponible'):myOrgMember?.last_seen_at&&Date.now()-new Date(myOrgMember.last_seen_at).getTime()<120000?presenceClass(myOrgMember.status):'offline')}/><ChevronRight size={13}/></button>{presenceMenuOpen&&<><button className="presence-dismiss" aria-label="Cerrar estados" onClick={()=>setPresenceMenuOpen(false)}/><div className="presence-popover"><strong>Mi disponibilidad</strong>{ORG_STATUSES.filter(status=>!myOrgMember || !isCommercialMember(myOrgMember) || status!=='Preparando pedido').map(status=><button key={status} className={myOrgMember?.status===status?'selected':''} onClick={()=>{if(myOrgMember) void updateMyOrgStatus(status);setPresenceMenuOpen(false)}}><i className={'presence-dot '+presenceClass(status)}/><span>{status}</span>{myOrgMember?.status===status&&<Check size={14}/>}</button>)}</div></>}</div><button className="icon-button theme-toggle" title="Cambiar tema" onClick={() => save({ ...store, theme: store.theme === 'dark' ? 'light' : 'dark' })}>{store.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button notification" onClick={() => setPage('Agenda')} title="Ver agenda"><Bell size={18}/></button><div className="top-avatar">{store.displayName.slice(0,2).toUpperCase()}</div></div></header>
      {mobileMenu && <button className="mobile-menu-scrim" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}/>}
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
          <footer className="footer"><span>EXECUTIVE HUB <b>·</b> YOUR DAY. UNDER CONTROL.</span><span>{guestMode?'SESIÓN TEMPORAL · SIN GUARDAR DATOS':'WORKSPACE PERSONAL'}</span></footer>
        </>}
        {active === 'Tareas' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">GESTIÓN PERSONAL</div><h1>Mis tareas</h1><p>Organiza prioridades, fechas y progreso.</p></div><button className="primary-button" onClick={()=>openTaskEditor()}><Plus size={15}/> Nueva tarea</button></div><div className="module-toolbar"><div className="filter-tabs">{(['all','pending','overdue','completed'] as const).map(f=><button key={f} className={taskFilter===f?'active':''} onClick={()=>setTaskFilter(f)}>{f==='all'?'Todas':f==='pending'?'Pendientes':f==='overdue'?'Vencidas':'Completadas'}</button>)}</div><span className="muted-small">{filteredTasks.length} tareas</span></div><div className="panel data-panel">{filteredTasks.length ? filteredTasks.map(t=><div className="data-row" key={t.id}><button className={`task-check ${t.status==='completed'?'checked':''}`} onClick={()=>toggleTask(t.id)}>{t.status==='completed'&&<Check size={13}/>}</button><div className="data-main"><strong className={t.status==='completed'?'is-done':''}>{t.title}</strong><span>{t.project} {t.dueAt?'· '+fmtDate(t.dueAt)+' '+fmtTime(t.dueAt):''}</span>{t.description&&<p>{t.description}</p>}{t.dueAt&&<span className={t.status!=='completed'&&dateInput(t.dueAt)<today()?'due-overdue':''}>{t.status==='completed'?'Completada':dateInput(t.dueAt)<today()?'Vencida':dateInput(t.dueAt)===today()?'Vence hoy':'Vence '+fmtDate(t.dueAt)}</span>}</div><select className="priority-inline" aria-label={`Cambiar prioridad de ${t.title}`} value={t.priority} onChange={e=>changeTaskPriority(t.id,e.target.value as Priority)}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select><button className="icon-button" title="Editar tarea" onClick={()=>openTaskEditor(t)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar tarea" onClick={()=>removeTask(t.id)}><Trash2 size={16}/></button></div>) : <p className="empty-state">No hay tareas en esta vista.</p>}</div></section>}
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
        {active === 'Reuniones' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">SEGUIMIENTO Y ACUERDOS</div><h1>Reuniones</h1><p>Registra asistentes, contexto, actas y acuerdos.</p></div><button className="primary-button" onClick={()=>openMeetingEditor()}><Plus size={15}/> Nueva reunión</button></div><div className="meeting-grid">{store.meetings.map(m=><article className="panel meeting-card" key={m.id}><div className="meeting-card-top"><div className="meeting-date-block"><strong>{fmtDate(m.startsAt)}</strong><span>{fmtTime(m.startsAt)}{m.endsAt?' – '+fmtTime(m.endsAt):''}</span></div><div className="meeting-card-actions"><button className="icon-button" title="Editar reunión" onClick={()=>openMeetingEditor(m)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar reunión" onClick={()=>{if(confirm('¿Eliminar esta reunión?'))save({...store,meetings:store.meetings.filter(x=>x.id!==m.id)})}}><Trash2 size={15}/></button></div></div><h3>{m.title}</h3><div className="meeting-details"><p className="meeting-meta"><Users size={14}/> <span>{m.attendees||'Sin asistentes indicados'}</span></p><p className="meeting-meta"><CalendarDays size={14}/> <span>{m.location||'Sin ubicación'}</span></p></div><div className="meeting-summary"><strong>Acta / contexto</strong><p>{m.summary||'Todavía no hay acta o resumen.'}</p><div className="meeting-agreements"><strong>Acuerdos y próximos pasos</strong><p>{m.agreements||'Sin acuerdos registrados todavía.'}</p></div></div></article>)}{!store.meetings.length&&<p className="empty-state">Todavía no has registrado reuniones.</p>}</div></section>}
        {active === 'Mi organización' && <section className="module-page organization-page">
          <div className="module-title"><div><div className="eyebrow">PERSONAS Y EQUIPOS</div><h1>Mi organización</h1><p>La estructura y actividad de la empresa, de un vistazo.</p></div></div>
          {!guestMode && !authSession?.user.is_anonymous && !myOrgMember ? <div className="panel org-onboarding"><div className="org-section-heading"><div><span className="eyebrow">ALTA EN LA ORGANIZACIÓN</span><h2>Completa tu ficha de empleado</h2><p>Tu perfil permitirá que el equipo te encuentre y conozca tu disponibilidad.</p></div><UserPlus size={22}/></div><div className="form-grid">{field('Nombre y apellidos',<input value={orgProfileDraft.full_name} onChange={e=>setOrgProfileDraft({...orgProfileDraft,full_name:e.target.value})} placeholder={store.displayName}/>)}{field('Departamento',<select value={orgProfileDraft.department} onChange={e=>setOrgProfileDraft({...orgProfileDraft,department:e.target.value})}>{ORG_DEPARTMENTS.map(department=><option key={department}>{department}</option>)}</select>)}{field('Puesto',<input value={orgProfileDraft.position} onChange={e=>setOrgProfileDraft({...orgProfileDraft,position:e.target.value})} placeholder="Tu puesto en la empresa"/>)}</div><button className="primary-button" onClick={registerOrgProfile} disabled={!orgProfileDraft.full_name.trim()}>Crear mi ficha</button><p className="muted-small">El alta inicial no concede permisos de dirección ni permite asignar tareas a otros empleados.</p></div> : <>
            {guestMode && <div className="notice-panel"><Sparkles size={16}/><p><strong>Demo corporativa · Germán</strong> Organización ficticia totalmente editable durante esta sesión.</p></div>}
            <div className="org-overview-grid"><div className="panel org-stat"><span>Personas</span><strong>{displayOrgMembers.length}</strong></div><div className="panel org-stat"><span>En actividad</span><strong>{displayOrgMembers.filter(m=>['Disponible','Ocupado','En llamada','Preparando pedido','En instalación'].includes(m.status)).length}</strong></div><div className="panel org-stat"><span>Tareas del equipo</span><strong>{displayOrgTasks.length}</strong></div><div className="panel org-stat"><span>Pendientes</span><strong>{displayOrgTasks.filter(t=>t.status!=='Completada').length}</strong></div></div>
            {orgView!=='home'&&<button className="org-back-button" onClick={()=>setOrgView('home')}><ChevronRight size={15}/> Volver a organización</button>}
            {orgView==='home'&&<div className="org-hub-grid">
              <button className="panel org-hub-card org-hub-primary" onClick={()=>setOrgView('chart')}><span className="org-hub-icon"><Building2 size={21}/></span><span><strong>Organigrama</strong><small>Jerarquía, responsables y equipos</small></span><ChevronRight size={18}/></button>
              <button className="panel org-hub-card" onClick={()=>setOrgView('team')}><span className="org-hub-icon"><Users size={21}/></span><span><strong>Directorio de personas</strong><small>Ficha, estado y departamento</small></span><ChevronRight size={18}/></button>
              <button className="panel org-hub-card" onClick={()=>setOrgView('tasks')}><span className="org-hub-icon"><ListTodo size={21}/></span><span><strong>Tareas del equipo</strong><small>Asignaciones, responsables y progreso</small></span><ChevronRight size={18}/></button>
              <div className="org-department-shortcuts"><div className="org-section-heading"><div><span className="eyebrow">ACCESO DIRECTO</span><h2>Departamentos</h2></div></div><div className="org-dept-buttons">{ORG_DEPARTMENTS.map(department=>{const people=displayOrgMembers.filter(m=>m.department===department);return <button className="panel org-dept-button" key={department} onClick={()=>{setOrgDepartment(department);setOrgView('department')}}><span>{department}</span><strong>{people.length}</strong><small>{people.length===1?'persona':'personas'}</small><ChevronRight size={15}/></button>})}</div></div>
            </div>}
            {orgView==='chart'&&<div className="org-subpage"><div className="org-section-heading"><div><span className="eyebrow">ESTRUCTURA JERÁRQUICA</span><h2>Organigrama</h2><p>Relaciones de dependencia y equipos.</p></div></div><div className="org-tree"><div className="org-tree-root"><div className="org-tree-node org-tree-ceo"><span className="org-avatar-large">G</span><b>Germán</b><small>Gerente · Dirección</small></div></div><div className="org-tree-level">{displayOrgMembers.filter(m=>m.manager_user_id==='demo-german'||(myOrgMember&&m.manager_user_id===myOrgMember.id)).map(lead=><div className="org-tree-column" key={lead.id}><div className="org-tree-node"><span className="org-avatar-large">{lead.full_name.slice(0,1)}</span><b>{lead.full_name}</b><small>{lead.position}</small><em>{lead.department}</em></div>{displayOrgMembers.filter(p=>p.manager_user_id===lead.id).length>0&&<div className="org-tree-children">{displayOrgMembers.filter(p=>p.manager_user_id===lead.id).map(person=><div className="org-tree-node org-tree-subnode" key={person.id}><span className="org-avatar-small">{person.full_name.slice(0,1)}</span><b>{person.full_name}</b><small>{person.position}</small></div>)}</div>}<button className="org-tree-open" onClick={()=>{setOrgDepartment(lead.department);setOrgView('department')}}>Ver equipo · {lead.department}</button></div>)}</div></div></div>}
            {orgView==='team'&&<div className="org-subpage"><div className="org-section-heading"><div><span className="eyebrow">DIRECTORIO</span><h2>Personas</h2><p>Estado de todo el equipo en una sola vista.</p></div></div><div className="org-presence-legend"><span><i className="presence-dot available"/>Disponible</span><span><i className="presence-dot busy"/>Ocupado</span><span><i className="presence-dot call"/>En llamada</span><span><i className="presence-dot preparing"/>Preparando pedido</span><span><i className="presence-dot installation"/>En instalación</span><span><i className="presence-dot away"/>Ausente</span><span><i className="presence-dot offline"/>Sin sesión</span></div><div className="org-people-grid">{displayOrgMembers.map(member=><button className="org-person-tile" key={member.id} onClick={()=>setSelectedOrgPerson(member)}><span className="org-person-avatar-wrap"><span className="org-avatar-large">{member.full_name.slice(0,1)}</span><i className={'presence-dot '+(isMemberOnline(member)?presenceClass(isCommercialMember(member)&&member.status==='Preparando pedido'?'Disponible':member.status):'offline')}/></span><b>{member.full_name}</b><small>{member.department}</small><em>{isMemberOnline(member)?(isCommercialMember(member)&&member.status==='Preparando pedido'?'Disponible':member.status):'Sin sesión'}</em></button>)}</div></div>}
            {orgView==='department'&&<div className="org-subpage"><div className="org-section-heading"><div><span className="eyebrow">DEPARTAMENTO</span><h2>{orgDepartment}</h2><p>{displayOrgMembers.filter(m=>m.department===orgDepartment).length} personas en el equipo.</p></div><button className="secondary-button" onClick={()=>setOrgView('chart')}>Ver organigrama</button></div><div className="org-team-list">{displayOrgMembers.filter(m=>m.department===orgDepartment).map(member=><article className="panel org-person-card" key={member.id}><div className="org-avatar">{member.full_name.slice(0,1)}</div><div className="org-person-main"><strong>{member.full_name}</strong><span>{member.position}</span><small className={'org-status org-status-'+(isCommercialMember(member)&&member.status==='Preparando pedido'?'Disponible':member.status).toLowerCase().replace(/ /g,'-')}>{isCommercialMember(member)&&member.status==='Preparando pedido'?'Disponible':member.status} · {member.status_note}</small></div>{canManageMember(member)&&member.id!==myOrgMember?.id&&<select value={isCommercialMember(member)&&member.status==='Preparando pedido'?'Disponible':member.status} onChange={e=>updateMemberStatus(member,e.target.value)}>{statusesForMember(member).map(status=><option key={status}>{status}</option>)}</select>}{canManageOrg&&member.id!==myOrgMember?.id&&<div className="org-person-actions"><label>Responsable</label><select value={member.manager_user_id||''} onChange={e=>updateOrgManager(member,e.target.value)}><option value="">Sin responsable</option>{displayOrgMembers.filter(p=>p.id!==member.id).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select><input placeholder="Nombre de la tarea" value={orgTaskDrafts[member.id]?.title||''} onChange={e=>setOrgTaskDrafts(current=>({...current,[member.id]:{title:e.target.value,description:current[member.id]?.description||'',due_at:current[member.id]?.due_at||today(),starts_at:current[member.id]?.starts_at||'09:00',ends_at:current[member.id]?.ends_at||'10:00'}}))}/><div className="org-task-schedule"><input aria-label="Fecha de tarea" type="date" value={orgTaskDrafts[member.id]?.due_at||today()} onChange={e=>setOrgTaskDrafts(current=>({...current,[member.id]:{title:current[member.id]?.title||'',description:current[member.id]?.description||'',due_at:e.target.value,starts_at:current[member.id]?.starts_at||'09:00',ends_at:current[member.id]?.ends_at||'10:00'}}))}/><input aria-label="Hora inicio" type="time" value={orgTaskDrafts[member.id]?.starts_at||'09:00'} onChange={e=>setOrgTaskDrafts(current=>({...current,[member.id]:{title:current[member.id]?.title||'',description:current[member.id]?.description||'',due_at:current[member.id]?.due_at||today(),starts_at:e.target.value,ends_at:current[member.id]?.ends_at||'10:00'}}))}/><input aria-label="Hora fin" type="time" value={orgTaskDrafts[member.id]?.ends_at||'10:00'} onChange={e=>setOrgTaskDrafts(current=>({...current,[member.id]:{title:current[member.id]?.title||'',description:current[member.id]?.description||'',due_at:current[member.id]?.due_at||today(),starts_at:current[member.id]?.starts_at||'09:00',ends_at:e.target.value}}))}/></div><button className="secondary-button" onClick={()=>assignOrgTask(member)}>Asignar tarea</button></div>}</article>)}</div></div>}
            {orgView==='tasks'&&<div className="org-subpage"><div className="org-section-heading"><div><span className="eyebrow">PLANIFICACIÓN Y CARGA</span><h2>Tareas del equipo</h2><p>Asignaciones agrupadas por departamento, con fecha y horario.</p></div></div><div className="org-task-groups">{ORG_DEPARTMENTS.filter(d=>d!=='Dirección').map(department=>{const people=displayOrgMembers.filter(m=>m.department===department);const tasks=displayOrgTasks.filter(task=>people.some(p=>p.id===task.assigned_to||p.user_id===task.assigned_to));return <section className="org-task-group" key={department}><header><b>{department}</b><span>{tasks.length} tareas</span></header>{tasks.length?tasks.map(task=>{const person=people.find(m=>m.id===task.assigned_to||m.user_id===task.assigned_to);return <article className="org-task-row" key={task.id}><span className="org-avatar-small">{(person?.full_name||'?').slice(0,1)}</span><div className="org-task-row-main"><b>{task.title}</b><small>{person?.full_name||'Sin asignar'} · {task.status}</small></div><div className="org-task-time"><b>{task.starts_at?fmtTime(task.starts_at):task.due_at?fmtTime(task.due_at):'—'}{task.ends_at?' – '+fmtTime(task.ends_at):''}</b><small>{task.starts_at?fmtDate(task.starts_at):task.due_at?fmtDate(task.due_at):'Sin fecha'}</small></div></article>}):<p className="org-empty">Sin tareas asignadas.</p>}</section>})}</div></div>}
          </>}
        </section>}
        {active === 'Notas' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">CONOCIMIENTO Y CONTEXTO</div><h1>Notas</h1><p>Captura ideas, decisiones y puntos importantes.</p></div><button className="primary-button" onClick={()=>{setEditingNote(null);setNoteDraft({title:'',content:''})}}><Plus size={15}/> Nueva nota</button></div><div className="notes-layout"><div className="panel note-editor"><div className="eyebrow">{editingNote?'EDITAR NOTA':'NUEVA NOTA'}</div><input className="note-title-input" value={noteDraft.title} onChange={e=>setNoteDraft({...noteDraft,title:e.target.value})} placeholder="Título de la nota"/><textarea value={noteDraft.content} onChange={e=>setNoteDraft({...noteDraft,content:e.target.value})} placeholder="Escribe aquí tus ideas, decisiones o recordatorios..."/><div className="note-editor-actions"><button className="secondary-button" onClick={()=>{setEditingNote(null);setNoteDraft({title:'',content:''})}}>Limpiar</button><button className="primary-button" onClick={saveNote}><Save size={14}/> Guardar nota</button></div></div><div className="notes-list">{[...store.notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(n=><article className="panel note-card" key={n.id}><div className="note-card-head"><strong>{n.title}</strong><div><button className="icon-button" title={n.pinned?'Desfijar':'Fijar'} onClick={()=>togglePin(n.id)}>{n.pinned?<Pin size={15}/>:<PinOff size={15}/>}</button><button className="icon-button" title="Editar" onClick={()=>editNote(n)}><Pencil size={15}/></button><button className="icon-button danger" title="Eliminar" onClick={()=>deleteNote(n.id)}><Trash2 size={15}/></button></div></div><p>{n.content||'Nota vacía'}</p><small>Actualizada {fmtDate(n.updatedAt)}</small></article>)}{!store.notes.length&&<p className="empty-state">Aún no tienes notas guardadas.</p>}</div></div></section>}
        {active === 'Preferencias' && <section className="module-page"><div className="module-title"><div><div className="eyebrow">PERSONALIZACIÓN</div><h1>Preferencias</h1><p>Adapta tu espacio de trabajo.</p></div></div><div className="panel settings-panel"><div className="setting-row"><div><strong>Nombre visible</strong><span>Se utiliza en el saludo y el perfil.</span></div><input value={settingsName} onChange={e=>setSettingsName(e.target.value)} /></div><div className="setting-row"><div><strong>Apariencia</strong><span>Selecciona el tema de la aplicación.</span></div><select value={settingsTheme} onChange={e=>setSettingsTheme(e.target.value as 'light'|'dark')}><option value="light">Corporate Light</option><option value="dark">Executive Dark</option></select></div>{guestMode ? <div className="setting-row"><div><strong>Modo invitado</strong><span>Los cambios solo existen durante esta sesión. Al salir o recargar, se perderán.</span></div><span className="storage-status">Temporal · Sin guardar</span></div> : <div className="setting-row"><div><strong>Almacenamiento</strong><span>Los datos de tu cuenta se sincronizan con tu workspace.</span></div><span className="storage-status">Nube · Supabase</span></div>}<div className="settings-actions">{!guestMode && <><button className="secondary-button" onClick={exportBackup}><Download size={14}/> Exportar copia</button><label className="secondary-button import-backup"><Upload size={14}/> Importar copia<input type="file" accept="application/json,.json" onChange={e=>{void importBackup(e.target.files?.[0]);e.currentTarget.value=''}} /></label></> }<button className="primary-button" onClick={()=>{save({...store,displayName:settingsName.trim()||'Usuario',theme:settingsTheme});setToast('Preferencias guardadas')}}><Save size={14}/> Guardar preferencias</button><button className="secondary-button" onClick={()=>{if(confirm('Esto eliminará todos los datos locales de esta demo y restaurará los datos de ejemplo. ¿Continuar?')){save(seed);setSettingsName(seed.displayName);setSettingsTheme(seed.theme);setToast('Datos de ejemplo restaurados')}}}><LogOut size={14}/> Restaurar demo</button></div></div>{guestMode && <div className="notice-panel"><Sparkles size={17}/><p><strong>Sesión temporal.</strong> No se guardan cambios ni se sincronizan datos. Al cerrar esta sesión o recargar la página, se perderán.</p></div>}</section>}
        {active === 'Asistente' && <section className="module-page assistant-page">
          <div className="module-title"><div><div className="eyebrow">EXECUTIVE INTELLIGENCE</div><h1>Asistente ejecutivo</h1><p>Un modelo de IA real con contexto de tu workspace.</p></div><span className="assistant-status"><i/> {authSession || guestMode ? 'GEMINI DISPONIBLE' : 'REQUIERE CUENTA'}</span></div>
          <div className="assistant-hero panel"><div className="assistant-hero-icon"><Sparkles size={22}/></div><div><span className="eyebrow">EXECUTIVE COPILOT · GOOGLE GEMINI</span><h2>Un copiloto que razona contigo.</h2><p>Pregunta libremente, analiza tus datos, prepara reuniones y redacta comunicaciones con contexto real.</p></div></div>
          {!isSupabaseConfigured || !supabase ? <div className="panel assistant-auth"><strong>Conexión pendiente</strong><p>La configuración segura de Supabase todavía no está disponible.</p></div> : <div className="assistant-workspace"><div className="panel assistant-chat">
            <div className="assistant-chat-head"><div><strong>Conversación con EXECUTIVE COPILOT</strong><span>Google Gemini · Gemini 3.8 Flash · contexto de tu workspace</span></div></div>
            <div className="assistant-suggestions">
              <button onClick={()=>submitAssistantQuestion('Prepara mi briefing ejecutivo de hoy.')}>✦ Briefing ejecutivo</button>
              <button onClick={()=>submitAssistantQuestion('Analiza mis prioridades y dime qué debería resolver primero.')}>Prioridades</button>
              <button onClick={()=>submitAssistantQuestion('Analiza mi agenda de esta semana y detecta conflictos.')}>Mi agenda</button>
              <button onClick={()=>submitAssistantQuestion('Prepara mis próximas reuniones con objetivos y decisiones pendientes.')}>Preparar reuniones</button>
              <button onClick={()=>submitAssistantQuestion('Detecta riesgos, retrasos y tareas vencidas.')}>Riesgos y vencimientos</button>
              <button onClick={()=>submitAssistantQuestion('Analiza el progreso general del workspace.')}>Progreso</button>
            </div>
            <div className="assistant-conversation">{assistantMessages.length ? assistantMessages.map((m,i)=><div key={i} className={m.role==='user'?'assistant-user-message':'assistant-reply'}>{m.role==='assistant'&&<Sparkles size={16}/>}<div className="assistant-markdown">{renderAssistantMarkdown(m.content)}</div></div>) : <div className="assistant-empty"><Sparkles size={22}/><strong>¿Qué necesitas resolver?</strong><span>Haz cualquier pregunta. El modelo puede razonar sobre tus datos y ayudarte con tareas ejecutivas.</span></div>}{assistantLoading&&<div className="assistant-reply"><Sparkles size={16}/><div><p>Analizando el contexto y preparando una respuesta…</p></div></div>}{assistantError&&<div className="assistant-error">{assistantError}</div>}</div>
            <form className="assistant-input-row" onSubmit={e=>{e.preventDefault();submitAssistantQuestion(assistantQuestion)}}><input value={assistantQuestion} onChange={e=>setAssistantQuestion(e.target.value)} placeholder="Pregunta lo que necesites…" disabled={assistantLoading}/><button type="submit" aria-label="Enviar consulta" disabled={assistantLoading||!assistantQuestion.trim()}><ArrowRight size={18}/></button></form>
          </div><aside className="assistant-side">
            <div className="panel"><div className="eyebrow">PULSO DEL WORKSPACE</div><div className="assistant-context-row"><span>Tareas abiertas</span><strong>{pending}</strong></div><div className="assistant-context-row"><span>Prioridad alta</span><strong>{tasks.filter(t=>t.status!=='completed'&&t.priority==='high').length}</strong></div><div className="assistant-context-row"><span>Vencidas</span><strong className={overdue?'assistant-risk':''}>{overdue}</strong></div><div className="assistant-context-row"><span>Eventos hoy</span><strong>{todayEvents.length}</strong></div><div className="assistant-context-row"><span>Notas guardadas</span><strong>{store.notes.length}</strong></div></div>
            <div className="panel assistant-guide"><div className="eyebrow">CAPACIDADES</div><p>Conversación abierta y razonamiento</p><p>Briefings y análisis de prioridades</p><p>Preparación de reuniones y actas</p><p>Redacción de correos y documentos</p><p>Lectura contextual de tareas, agenda y notas</p></div>
            <div className="panel assistant-note"><Sparkles size={17}/><strong>Datos y privacidad</strong><p>El contenido de tu workspace se envía a Google Gemini para generar respuestas. La clave permanece en el servidor. En el nivel gratuito de Google, Google puede utilizar los datos enviados para mejorar sus productos. No incluyas información confidencial. Las conversaciones no se guardan en una base de datos por ahora.</p></div>
          </aside></div>}
        </section>}
      </div>
    </main>
    <nav className="mobile-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?'mobile-active':''} onClick={()=>setPage(item.label)}><Icon size={19}/><span>{item.label==='Resumen'?'Inicio':item.label}</span></button>})}</nav>
    {taskForm && modal(editingTaskId ? 'Editar tarea' : 'Nueva tarea',()=>setTaskForm(false),<div className="form-grid">{field('Título',<input value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} placeholder="¿Qué necesitas hacer?"/>)}{field('Proyecto / área',<input value={taskDraft.project} onChange={e=>setTaskDraft({...taskDraft,project:e.target.value})} placeholder="General"/>)}{field('Fecha',<input type="date" value={taskDraft.dueDate} onChange={e=>setTaskDraft({...taskDraft,dueDate:e.target.value})}/>)}{field('Hora',<input type="time" value={taskDraft.dueTime} onChange={e=>setTaskDraft({...taskDraft,dueTime:e.target.value})}/>)}{field('Prioridad',<select value={taskDraft.priority} onChange={e=>setTaskDraft({...taskDraft,priority:e.target.value as Priority})}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select>)}{field('Descripción',<textarea value={taskDraft.description} onChange={e=>setTaskDraft({...taskDraft,description:e.target.value})} placeholder="Detalles opcionales"/>)}</div>,addTask,'Crear tarea')}
    {eventForm && modal(editingEventId ? 'Editar evento' : 'Nuevo evento',()=>setEventForm(false),<div className="form-grid">{field('Título',<input value={eventDraft.title} onChange={e=>setEventDraft({...eventDraft,title:e.target.value})}/>)}{field('Fecha',<input type="date" value={eventDraft.date} onChange={e=>setEventDraft({...eventDraft,date:e.target.value})}/>)}{field('Inicio',<input type="time" value={eventDraft.start} onChange={e=>setEventDraft({...eventDraft,start:e.target.value})}/>)}{field('Fin',<input type="time" value={eventDraft.end} onChange={e=>setEventDraft({...eventDraft,end:e.target.value})}/>)}{field('Ubicación',<input value={eventDraft.location} onChange={e=>setEventDraft({...eventDraft,location:e.target.value})}/>)}{field('Tipo',<select value={eventDraft.type} onChange={e=>setEventDraft({...eventDraft,type:e.target.value as EventItem['type']})}><option value="meeting">Reunión</option><option value="focus">Trabajo de foco</option><option value="reminder">Recordatorio</option><option value="personal">Personal</option></select>)}{field('Descripción',<textarea value={eventDraft.description} onChange={e=>setEventDraft({...eventDraft,description:e.target.value})}/>)}</div>,addEvent,'Guardar evento')}
    {meetingForm && modal(editingMeetingId ? 'Editar reunión' : 'Nueva reunión',()=>setMeetingForm(false),<div className="form-grid">{field('Título',<input value={meetingDraft.title} onChange={e=>setMeetingDraft({...meetingDraft,title:e.target.value})}/>)}{field('Fecha',<input type="date" value={meetingDraft.date} onChange={e=>setMeetingDraft({...meetingDraft,date:e.target.value})}/>)}{field('Inicio',<input type="time" value={meetingDraft.start} onChange={e=>setMeetingDraft({...meetingDraft,start:e.target.value})}/>)}{field('Fin',<input type="time" value={meetingDraft.end} onChange={e=>setMeetingDraft({...meetingDraft,end:e.target.value})}/>)}{field('Ubicación',<input value={meetingDraft.location} onChange={e=>setMeetingDraft({...meetingDraft,location:e.target.value})}/>)}{field('Asistentes',<input value={meetingDraft.attendees} onChange={e=>setMeetingDraft({...meetingDraft,attendees:e.target.value})} placeholder="Nombres o equipos"/>)}{field('Acta / contexto',<textarea value={meetingDraft.summary} onChange={e=>setMeetingDraft({...meetingDraft,summary:e.target.value})} placeholder="Temas tratados, decisiones y contexto..."/>)}{field('Acuerdos y próximos pasos',<textarea value={meetingDraft.agreements} onChange={e=>setMeetingDraft({...meetingDraft,agreements:e.target.value})} placeholder="Acciones acordadas, responsables y fechas..."/>)}</div>,addMeeting,'Crear reunión')}
    {selectedOrgPerson && <div className="modal-backdrop" onClick={()=>setSelectedOrgPerson(null)}><div className="task-modal org-person-modal" role="dialog" aria-modal="true" aria-labelledby="org-person-dialog-title" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">DIRECTORIO · FICHA DE PERSONA</span><h2 id="org-person-dialog-title">{selectedOrgPerson.full_name}</h2><p className="muted-small">{selectedOrgPerson.position} · {selectedOrgPerson.department}</p></div><button className="icon-button" aria-label="Cerrar" onClick={()=>setSelectedOrgPerson(null)}><X size={18}/></button></div><div className="org-person-modal-status"><i className={'presence-dot '+(isMemberOnline(selectedOrgPerson)?presenceClass(isCommercialMember(selectedOrgPerson)&&selectedOrgPerson.status==='Preparando pedido'?'Disponible':selectedOrgPerson.status):'offline')}/><strong>{isMemberOnline(selectedOrgPerson)?(isCommercialMember(selectedOrgPerson)&&selectedOrgPerson.status==='Preparando pedido'?'Disponible':selectedOrgPerson.status):'Sin sesión'}</strong></div>{canManageMember(selectedOrgPerson)?<><div className="eyebrow org-modal-section-label">ASIGNAR TAREA</div><div className="form-grid">{field('Nombre de la tarea',<input value={orgTaskDrafts[selectedOrgPerson.id]?.title||''} onChange={e=>setOrgTaskDrafts(current=>({...current,[selectedOrgPerson.id]:{title:e.target.value,description:current[selectedOrgPerson.id]?.description||'',due_at:current[selectedOrgPerson.id]?.due_at||today(),starts_at:current[selectedOrgPerson.id]?.starts_at||'09:00',ends_at:current[selectedOrgPerson.id]?.ends_at||'10:00'}}))} placeholder="¿Qué tiene que hacer?"/>)}{field('Descripción',<textarea value={orgTaskDrafts[selectedOrgPerson.id]?.description||''} onChange={e=>setOrgTaskDrafts(current=>({...current,[selectedOrgPerson.id]:{title:current[selectedOrgPerson.id]?.title||'',description:e.target.value,due_at:current[selectedOrgPerson.id]?.due_at||today(),starts_at:current[selectedOrgPerson.id]?.starts_at||'09:00',ends_at:current[selectedOrgPerson.id]?.ends_at||'10:00'}}))} placeholder="Detalles de la tarea (opcional)"/>)}{field('Fecha',<input type="date" value={orgTaskDrafts[selectedOrgPerson.id]?.due_at||today()} onChange={e=>setOrgTaskDrafts(current=>({...current,[selectedOrgPerson.id]:{title:current[selectedOrgPerson.id]?.title||'',description:current[selectedOrgPerson.id]?.description||'',due_at:e.target.value,starts_at:current[selectedOrgPerson.id]?.starts_at||'09:00',ends_at:current[selectedOrgPerson.id]?.ends_at||'10:00'}}))}/>)}{field('Hora de inicio',<input type="time" value={orgTaskDrafts[selectedOrgPerson.id]?.starts_at||'09:00'} onChange={e=>setOrgTaskDrafts(current=>({...current,[selectedOrgPerson.id]:{title:current[selectedOrgPerson.id]?.title||'',description:current[selectedOrgPerson.id]?.description||'',due_at:current[selectedOrgPerson.id]?.due_at||today(),starts_at:e.target.value,ends_at:current[selectedOrgPerson.id]?.ends_at||'10:00'}}))}/>)}{field('Hora de fin',<input type="time" value={orgTaskDrafts[selectedOrgPerson.id]?.ends_at||'10:00'} onChange={e=>setOrgTaskDrafts(current=>({...current,[selectedOrgPerson.id]:{title:current[selectedOrgPerson.id]?.title||'',description:current[selectedOrgPerson.id]?.description||'',due_at:current[selectedOrgPerson.id]?.due_at||today(),starts_at:current[selectedOrgPerson.id]?.starts_at||'09:00',ends_at:e.target.value}}))}/>)}</div><div className="modal-actions"><button className="secondary-button" onClick={()=>setSelectedOrgPerson(null)}>Cerrar</button><button className="primary-button" onClick={async()=>{if(await assignOrgTask(selectedOrgPerson))setSelectedOrgPerson(null)}}><Save size={14}/> Asignar tarea</button></div></>:<><div className="org-permission-note"><Users size={17}/><p>No tienes permisos para asignar tareas a esta persona. Solo su responsable directo o un administrador pueden hacerlo.</p></div><div className="modal-actions"><button className="secondary-button" onClick={()=>setSelectedOrgPerson(null)}>Cerrar</button></div></>}</div></div>}
    {toast && <div className="toast-message">{toast}</div>}
  </div>
}
export default App
