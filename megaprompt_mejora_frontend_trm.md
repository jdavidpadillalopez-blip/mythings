# Mega Prompt — Mejora de Frontend + Histórico TRM (Claude en VS Code)

Actúa como un Ingeniero Frontend Senior especializado en React, Tailwind CSS, animaciones (Framer Motion) y visualización de datos financieros con Recharts/Chart.js. Vas a intervenir un proyecto **existente** de registro financiero personal (Ingresos en USD, Gastos en COP, Deudas, TRM diaria). Tu tarea NO es reescribir la app desde cero: es **refactorizar y elevar el frontend** para que se sienta fluido, profesional y con una experiencia de "histórico de TRM" inspirada en Google Finance.

Antes de escribir código, lee todo el proyecto (`src/`, componentes, contexto/estado global, y cualquier lógica de TRM existente) para entender la arquitectura actual y no romper funcionalidad. Luego aplica los cambios descritos abajo.

## 1. Objetivo General
Transformar el frontend actual en una experiencia fluida (transiciones suaves, feedback visual inmediato, skeleton loaders, sin recargas bruscas) y agregar un módulo de **Histórico de TRM USD/COP** con gráfica de línea interactiva al estilo Google Finance (hover con tooltip, selector de rango de tiempo, variación porcentual destacada en verde/rojo).

## 2. Módulo Nuevo: Histórico de TRM (estilo Google Finance)

Crea un componente `TrmHistoryChart.jsx` con:

- **Gráfica de línea/área** (Recharts `AreaChart` o `LineChart`) mostrando la evolución del TRM USD→COP en el tiempo.
- **Selector de rango** con pestañas tipo pill: `1D`, `1S`, `1M`, `3M`, `1A`, `Todo` (similar a Google Finance), que filtra los puntos mostrados en el gráfico.
- **Encabezado de precio destacado**: TRM actual en grande (ej. `$4,050.23 COP`), y debajo la variación absoluta y porcentual respecto al periodo seleccionado, coloreada en verde si sube o rojo si baja, con flecha ▲/▼.
- **Tooltip interactivo al hacer hover**: al pasar el mouse sobre la línea, mostrar un punto (dot) que sigue el cursor, una línea vertical guía, y un tooltip con fecha exacta + valor TRM en esa fecha (replicando el comportamiento de Google Finance).
- **Área de degradado bajo la línea** (verde si la tendencia del rango es positiva, rojo si es negativa), usando `<defs><linearGradient>` de SVG.
- **Fuente de datos**: 
  - Si ya existe una API o localStorage guardando el TRM diario, reutilízala. 
  - Si no existe histórico persistente, implementa que cada vez que la app obtenga o el usuario actualice manualmente la TRM del día, se guarde un registro `{ fecha, valor, fuente: 'api'|'manual' }` en un array en `localStorage` (clave `trm_history`), evitando duplicados por día (si ya existe un registro del mismo día, se actualiza en vez de duplicar).
  - Genera una función utilitaria `getTrmHistoryFiltered(range)` que filtre el array histórico según el rango seleccionado (1D, 1S, 1M, 3M, 1A, Todo).
- Si el histórico tiene pocos datos (usuario recién empieza a usar la app), muestra un estado vacío amigable: "Aún no hay suficiente histórico. Se irá construyendo con cada actualización diaria de la TRM."

## 3. Integración con el resto de la App

- El widget de TRM actual (`TrmWidget.jsx`) debe poder expandirse/colapsarse para mostrar el `TrmHistoryChart` (por ejemplo, un botón "Ver histórico" o un modal/drawer lateral).
- Cuando el usuario actualiza la TRM manualmente, debe:
  1. Actualizar el valor activo usado en los cálculos de ingresos.
  2. Agregar/actualizar el registro correspondiente en `trm_history`.
  3. Disparar una animación breve (ej. fade/flash del número) confirmando el cambio.
- Todos los cálculos que dependan de la TRM (conversión USD↔COP en ingresos, tarjetas resumen, gráfico de pastel) deben re-renderizarse reactivamente sin necesidad de recargar la página.

## 4. Mejoras Generales de Fluidez del Frontend

- Instala y usa **Framer Motion** para:
  - Transiciones de entrada/salida en tarjetas del dashboard (fade + slide sutil).
  - Animación al agregar/eliminar un gasto, ingreso o deuda (la fila aparece/desaparece con transición, no de golpe).
  - Animación de expansión/colapso del histórico de TRM.
- Agrega **skeleton loaders** (placeholders animados tipo shimmer) mientras se cargan datos de la API de TRM o mientras se calculan los totales.
- Revisa que todos los inputs de formularios (ingresos, gastos, deudas) tengan estados de `focus`, `hover` y `error` claramente diferenciados con Tailwind (bordes, anillos de foco, mensajes de validación inline).
- Añade **transiciones suaves** (`transition-colors`, `transition-transform duration-200`) en botones, tarjetas y filas de tablas para evitar cambios abruptos.
- Verifica y mejora el **responsive**: el dashboard y el histórico de TRM deben verse bien en mobile (gráfico con scroll horizontal si es necesario, tarjetas en columna).
- Mejora la jerarquía visual del Modo Oscuro existente: asegúrate de que los verdes (ingresos/positivo) y rojos/naranjas (gastos/negativo) tengan suficiente contraste y consistencia en todos los componentes nuevos y existentes.
- Si no existe ya, agrega una barra de navegación o tabs superiores fijas (Dashboard | Ingresos | Gastos | Deudas | Histórico TRM) con indicador de sección activa animado (subrayado deslizante tipo underline-slide).

## 5. Calidad de Código

- Mantén separación de responsabilidades: lógica de datos/cálculos en hooks personalizados (ej. `useTrmHistory.js`, `useFinanceSummary.js`), y componentes enfocados solo en presentación.
- Usa `PropTypes` o TypeScript (si el proyecto ya usa TS, sigue esa convención; si no, no lo introduzcas a menos que se solicite).
- No rompas la funcionalidad existente de: registro de ingresos en USD, gastos fijos/variables, celdas de deuda integradas a gastos fijos, y gráfico de pastel de distribución de gastos vs ingresos.
- Comenta brevemente las funciones de cálculo financiero (conversión de divisas, filtrado de rangos de fecha) para mantenibilidad.

## 6. Entregable

1. Lista de archivos nuevos y modificados con una breve descripción de qué cambia en cada uno.
2. Código completo de cada archivo nuevo o modificado, listo para copiar y pegar.
3. Si se requiere una librería nueva (ej. `framer-motion`), indica el comando de instalación exacto.
4. Al final, un breve checklist de verificación manual (qué probar en el navegador: hover en el gráfico, cambio de rango, actualización manual de TRM, responsive, animaciones de agregar/eliminar registros).
