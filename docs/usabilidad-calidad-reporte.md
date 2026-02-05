# Reporte de pruebas de usabilidad y calidad

Fecha: 2026-02-05

## 1) Alcance y metodología

Se ejecutaron pruebas automáticas de calidad técnica y una revisión heurística de usabilidad/accesibilidad sobre la interfaz existente.

### Comandos ejecutados

1. `npm run lint`
2. `npm test`
3. `npm run build`

## 2) Resultados de calidad técnica

## Resumen ejecutivo

- **Linting:** ❌ Falla con **34 hallazgos** (20 errores, 14 warnings).
- **Tests unitarios:** ✅ Pasa, pero con cobertura funcional insuficiente (**solo 1 test de ejemplo**).
- **Build de producción:** ✅ Compila, pero con **bundle principal demasiado grande** (> 1 MB minificado).

## Hallazgos detallados

### 2.1 Linting con errores bloqueantes

`npm run lint` reporta errores que deben corregirse antes de considerar el código estable:

- Uso de `any` en hooks/páginas y función edge (afecta tipado y mantenibilidad).
- Interfaces vacías en componentes UI (`no-empty-object-type`).
- `require()` en `tailwind.config.ts` (`no-require-imports`).
- Efectos con dependencias faltantes (`react-hooks/exhaustive-deps`).

> Impacto: alto. Riesgo de bugs silenciosos, regresiones y deuda técnica acumulada.

### 2.2 Suite de tests insuficiente

`npm test` pasa, pero actualmente solo existe un test de ejemplo:

- `src/test/example.test.ts`.

> Impacto: alto. La aplicación puede romperse en flujos críticos sin ser detectado en CI.

### 2.3 Build con warning de performance

`npm run build` compila, pero reporta:

- `dist/assets/index-*.js` ~1,037 kB minificado.
- Warning de chunks > 500 kB (sugerencia de code splitting).

> Impacto: medio/alto. Tiempo de carga inicial mayor, peor experiencia en redes lentas y dispositivos modestos.

## 3) Resultados de usabilidad (revisión heurística)

## Hallazgos prioritarios

### U1. Navegación móvil con accesibilidad incompleta

En el layout principal, el botón de menú móvil (`Button` tipo icon-only) no expone etiqueta accesible (`aria-label`).

- Impacto: usuarios de lector de pantalla no reciben contexto del control.
- Severidad: alta (accesibilidad básica).

### U2. Cierre del menú móvil orientado a puntero

El overlay se cierra por click, pero no hay evidencia explícita de atajo por teclado (`Escape`) en este componente.

- Impacto: fricción para navegación por teclado.
- Severidad: media.

### U3. Mensajes de error técnicos al usuario final

En autenticación y otros flujos se exponen mensajes de error directos (`error.message`) en varios casos.

- Impacto: poca claridad para usuario final + posible filtrado de mensajes internos.
- Severidad: media.

### U4. Estados de carga sin SLA visual consistente

Hay buenas prácticas en varias pantallas, pero no una estrategia homogénea de skeletons/placeholders para todas las vistas críticas.

- Impacto: percepción de lentitud e incertidumbre del usuario.
- Severidad: media.

## 4) Priorización de problemas

## Prioridad P0 (bloqueante)

1. Corregir errores de lint (tipado, hooks, imports no permitidos).
2. Establecer base de pruebas en flujos críticos (autenticación, marcaje IN/OUT, permisos por rol).

## Prioridad P1 (alta)

1. Mejorar accesibilidad de navegación móvil (`aria-*`, foco, escape).
2. Homogeneizar mensajes de error orientados al usuario.
3. Reducir bundle inicial con división por rutas/módulos.

## Prioridad P2 (media)

1. Documentar estándares UX/UI y accesibilidad.
2. Ampliar pruebas E2E para escenarios de geolocalización y restricciones por horario.

## 5) Conclusión

El proyecto **funciona y compila**, pero actualmente presenta una brecha clara entre “funcional” y “listo para operación robusta”. El principal riesgo está en calidad interna (lint + baja cobertura), seguido por accesibilidad/performance en la experiencia de uso.

