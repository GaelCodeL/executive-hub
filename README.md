# EXECUTIVE HUB

**Your day. Under control.**  
Personal Executive Workspace: un espacio de trabajo ejecutivo para organizar agenda, prioridades, tareas y reuniones sin sustituir el ERP corporativo.

## Estado actual

Primera versión de interfaz (demo) construida con React, TypeScript y Vite.

Incluye:
- Dashboard ejecutivo con resumen de jornada.
- Agenda visual semanal y compromisos del día (datos ficticios).
- Lista de prioridades y tareas con interacción local.
- Alta y finalización de tareas en el estado de la aplicación.
- Tema Corporate Light y Executive Dark.
- Navegación adaptable a escritorio y móvil, con barra inferior para iPhone.

> Los datos actuales son exclusivamente de demostración. Todavía no existe persistencia ni conexión con Supabase.

## Stack
- React + TypeScript + Vite
- Tailwind CSS
- Lucide React
- Recharts (reservado para visualizaciones futuras)

## Requisitos
- Node.js 20+
- npm

## Desarrollo
```bash
npm install
npm run dev
```

## Compilación
```bash
npm run build
```

## Próximas fases
1. Completar módulos de tareas, agenda, reuniones y notas.
2. Diseñar el modelo de datos y migraciones PostgreSQL.
3. Integrar Supabase Auth y Row Level Security.
4. Persistencia y sincronización multidispositivo.
5. Configurar PWA e instalación en iPhone.
6. Añadir funciones de IA mediante endpoints seguros en servidor.

## Seguridad
No guardar claves privadas en el frontend. No introducir información real o confidencial de la empresa en esta demo sin autorización.
