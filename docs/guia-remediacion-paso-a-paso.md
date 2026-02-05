# Guía paso a paso para corregir los problemas detectados

## Objetivo

Eliminar hallazgos de calidad/usabilidad por prioridad, minimizando regresiones.

## Fase 0 — Preparación (día 0)

1. Crear una rama de trabajo dedicada para remediación.
2. Definir política de “no merge con lint en rojo”.
3. Acordar criterio de “Definition of Done”:
   - lint sin errores,
   - tests críticos verdes,
   - build sin warning de chunk crítico (o con justificación documentada).

---

## Fase 1 — Calidad técnica base (P0)

### Paso 1: Corregir tipado y reglas bloqueantes de ESLint

- Reemplazar `any` por tipos concretos (DTOs de Supabase, tipos de error, tipos de estado).
- Corregir interfaces vacías en componentes UI.
- Sustituir `require()` por `import` en `tailwind.config.ts`.
- Resolver dependencias faltantes en `useEffect` (usar `useCallback` donde aplique).

**Criterio de salida:** `npm run lint` sin errores.

### Paso 2: Endurecer manejo de errores de negocio

- Crear un mapeador central de errores técnicos → mensajes amigables para usuario.
- Evitar mostrar mensajes crudos de backend salvo en logs internos.

**Criterio de salida:** mensajes de error consistentes y comprensibles en Auth y pantallas críticas.

### Paso 3: Crear batería mínima de pruebas funcionales

Agregar pruebas para:

1. Login exitoso y fallido.
2. Restricción por rol (`global_manager`, `department_head`, usuario estándar).
3. Marcaje de asistencia dentro/fuera de geocerca.
4. Bloqueo por horario de check-in.

**Criterio de salida:** al menos 8–12 pruebas útiles (unitarias + integración ligera) con ejecución en CI.

---

## Fase 2 — Usabilidad y accesibilidad (P1)

### Paso 4: Accesibilidad de navegación móvil

- Añadir `aria-label` al botón de menú.
- Implementar cierre por tecla `Escape`.
- Gestionar foco al abrir/cerrar menú (focus trap o retorno de foco al botón).

**Criterio de salida:** navegación principal usable con teclado y lector de pantalla.

### Paso 5: Mejorar feedback de carga y vacío

- Definir patrón único para:
  - loading,
  - empty state,
  - error state,
  - success state.
- Aplicarlo a Auth, Attendance, History, Department, UserManagement.

**Criterio de salida:** experiencia consistente de estados asíncronos.

### Paso 6: Validaciones de formularios con microcopy consistente

- Estandarizar textos de validación (tono, longitud, acción sugerida).
- Evitar ambigüedad en errores de autenticación y configuración.

**Criterio de salida:** copy UX unificado y orientado a acción.

---

## Fase 3 — Performance y escalabilidad (P1)

### Paso 7: Reducir bundle inicial

- Implementar `React.lazy`/`Suspense` por ruta para páginas pesadas.
- Evaluar `manualChunks` en Vite para dependencias grandes.
- Cargar utilidades costosas bajo demanda (por ejemplo exportación XLSX).

**Criterio de salida:** bundle principal por debajo de 500 kB por chunk crítico (o reducción significativa documentada).

### Paso 8: Monitoreo de rendimiento básico

- Medir Web Vitals (LCP, INP, CLS).
- Definir umbrales y seguimiento quincenal.

**Criterio de salida:** línea base de performance y plan de mejora continua.

---

## Fase 4 — Cierre y prevención (P2)

### Paso 9: Automatización en CI

Pipeline mínimo por PR:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`

Opcional recomendado:

- auditoría de dependencias,
- reporte de cobertura,
- checks de accesibilidad automatizada.

### Paso 10: Checklist de release

Antes de liberar:

- sin errores de lint,
- pruebas clave verdes,
- rutas protegidas verificadas por rol,
- navegación móvil accesible,
- tiempos de carga aceptables en red móvil simulada.

---

## Orden sugerido de ejecución (resumen)

1. **Lint y tipado (P0).**
2. **Tests críticos (P0).**
3. **Accesibilidad menú + microcopy de errores (P1).**
4. **Optimización de bundle (P1).**
5. **Automatización CI y checklist release (P2).**

Este orden reduce riesgo temprano y permite mejoras visibles para usuario sin comprometer estabilidad.

