# Mega Prompt — Cerrar brechas frente a la app de referencia (Claude en VS Code)

Actúa como un Ingeniero Frontend Senior especializado en React, Tailwind CSS, Framer Motion y PWA. Vas a ampliar un proyecto **existente** de gestión financiera personal (React + Vite + Tailwind + Context/reducer, con TRM USD/COP, deudas con plan de cuotas, gastos fijos/variables y dashboard con gráfico de pastel). El proyecto ya tiene esta estructura relevante que debes leer antes de tocar nada:

- `src/context/AppContext.jsx` — estado global vía `useReducer`, persistido en `localStorage` (clave `finanzas-usd-cop-state`), con acciones `ADD_INCOME`, `ADD_DEBT`, `TOGGLE_DEBT_INSTALLMENT`, `ADD_FIXED_EXPENSE`, `ADD_VARIABLE_EXPENSE`, etc.
- `src/utils/debts.js` — modelo y migración de deudas (`debts_v2`).
- `src/hooks/useFinanceSummary.js`, `useDebtProgress.js`, `useTrmHistory.js` — cálculos derivados.
- `src/components/` — `Dashboard.jsx`, `DebtManager.jsx`, `ExpenseForm.jsx`, `ExpenseChart.jsx`, `IncomeForm.jsx`, `NavTabs.jsx`, `TrmWidget.jsx`, `TrmHistoryChart.jsx`, componentes de progreso de deuda (`DebtPayoffMountain/Ring/Roadmap`).

No reescribas lo existente: **añade** los módulos descritos abajo integrándolos al reducer y a la navegación actuales, reutilizando el patrón ya establecido (acciones + reducer + hooks derivados + componentes de presentación con Tailwind/Framer Motion).

Estas funcionalidades están inspiradas en una app de referencia hecha en vanilla JS que tiene piezas que esta app aún no tiene. Impleméntalas siguiendo la arquitectura React/reducer ya existente, no la arquitectura vanilla del original.

---

## 1. Módulo de Bolsillos (metas de ahorro/inversión)

Nueva entidad independiente de las deudas, para dinero que el usuario aparta con un propósito (ahorro, inversión, fondo de emergencia, etc.), no una obligación de pago.

Modelo de datos (nueva slice en el reducer, `pockets`):

```js
{
  id: string,
  nombre: string,
  tipo: 'ahorro' | 'inversion' | 'meta' | 'fondo_emergencia',
  valorActual: number,       // COP
  meta: number | null,       // COP, opcional
  vencimiento: string | null,// fecha objetivo, opcional
  historialAportes: [
    { id, fecha, concepto, monto }
  ]
}
```

Componentes:
- `PocketManager.jsx`: listado de bolsillos (tarjetas), formulario de creación/edición (nombre, tipo, valor inicial, meta opcional, vencimiento opcional).
- `PocketDetailModal.jsx`: al hacer clic en un bolsillo, modal con un gráfico radial/donut (Recharts) de "acumulado vs. faltante para la meta" (reutiliza estilo visual de `DebtPayoffRing.jsx` para mantener consistencia, no un componente desconectado), historial de aportes en tabla, y un formulario rápido para "agregar aporte" (monto + concepto + fecha), que actualiza `valorActual` y agrega una entrada al `historialAportes`.
- Acciones nuevas en el reducer: `ADD_POCKET`, `UPDATE_POCKET`, `DELETE_POCKET`, `ADD_POCKET_CONTRIBUTION`.
- Sumar el total de bolsillos como una tarjeta resumen adicional en `Dashboard.jsx` (no lo mezcles con el cálculo de flujo de caja libre — los bolsillos son ahorro, no gasto).
- Agrega "Bolsillos" como nuevo tab en `NavTabs.jsx`.

## 2. Motor de Transacciones Recurrentes Genérico

Permite definir una regla una sola vez y que el sistema proyecte automáticamente las transacciones futuras, para cualquier ingreso o gasto (no solo cuotas de deuda, que ya tienen su propio sistema).

Modelo (`recurringRules` en el reducer):

```js
{
  id: string,
  tipo: 'ingreso' | 'gasto_fijo' | 'gasto_variable',
  concepto: string,
  categoria: string,
  monto: number,
  frecuencia: 'semanal' | 'quincenal' | 'mensual',
  diaReferencia: number,      // día del mes o día de la semana según frecuencia
  fechaDesde: string,
  fechaHasta: string | null,  // null = indefinido (se regenera al abrir la app)
  bolsilloId: string | null,  // opcional: si el ingreso/gasto está asociado a un bolsillo
}
```

- Función `generarTransaccionesDesdeRegla(regla, hastaFecha)` en `src/utils/recurring.js`: genera las entradas de ingreso/gasto correspondientes entre `fechaDesde` y `hastaFecha` (o `fechaHasta` si existe), respetando la frecuencia, evitando duplicar transacciones ya generadas previamente (marca cada transacción generada con `origenReglaId` para poder deduplicar por regla + fecha).
- Al cargar la app (o al cambiar de mes), regenerar automáticamente las transacciones pendientes hasta la fecha actual para reglas sin `fechaHasta` o con `fechaHasta` futura.
- Componente `RecurringRuleManager.jsx`: formulario para crear reglas + tabla de reglas activas con botón "Pausar/Eliminar".
- Integra esto en el tab de Gastos/Ingresos existente (no necesita ser un tab nuevo obligatoriamente) o como sub-sección "Recurrentes".

## 3. Reportes con Filtros + Exportación a PDF

Nuevo componente `Reports.jsx` con:
- Filtros: tipo (todos/ingreso/gasto), categoría, texto libre en concepto, rango de fechas con atajos rápidos ("Mes actual", "Mes pasado", "Año actual") que autocompletan el rango.
- Tabla de resultados ordenable por columna (ver punto 5).
- Totales del subconjunto filtrado (ingresos, gastos, neto) y un gráfico de barras (ingresos vs. gastos) + un doughnut por categoría (Recharts), ambos recalculados según el filtro activo.
- Botón "Exportar a PDF": usa `window.print()` con una hoja de estilos `@media print` dedicada (oculta sidebar/nav, muestra solo el reporte con encabezado, tabla y totales) — no agregues una librería de generación de PDF pesada si `window.print()` cubre el caso, mantenlo simple como en la app de referencia.
- Este reporte debe cruzar datos de ingresos, gastos fijos, gastos variables, cuotas de deuda del mes y aportes a bolsillos, ya que hoy viven en slices separadas del estado.

## 4. Backup / Restore y Borrado Total

Nueva sección o panel en Configuración (crea `src/components/DataManagement.jsx` si no existe una vista de configuración aún):
- "Exportar datos": serializa el estado completo (`incomes`, `debts`, `fixedExpenses`, `variableExpenses`, `pockets`, `recurringRules`, `trm`) a un archivo `.json` descargable con nombre `respaldo_finanzas_YYYY-MM-DD.json`.
- "Importar datos": input de archivo que parsea el JSON y reemplaza el estado completo vía una nueva acción `IMPORT_STATE`, con validación básica de forma (si el JSON no tiene la forma esperada, muestra error sin romper la app) y confirmación previa ("Esto reemplazará todos tus datos actuales, ¿continuar?").
- "Borrar todos los datos": botón con confirmación explícita (modal, no `confirm()` nativo, para mantener consistencia visual) que limpia `localStorage` y reinicia el estado a `initialState`.

## 5. Orden y Paginación de Tablas

Crea un hook reutilizable `useSortablePaginatedList(items, { defaultSortColumn, pageSize })` en `src/hooks/useSortablePaginatedList.js` que retorne `{ sortedItems, sortColumn, sortDirection, toggleSort, page, totalPages, setPage, pageSize, setPageSize }`.

Y un componente de presentación `DataTable.jsx` genérico (columnas configurables por props, con header clickeable que muestra ícono de orden activo, y controles de paginación al estilo simple — anterior/siguiente + números, sin necesidad de replicar exactamente el estilo "Mercado Libre" del original, pero sí la funcionalidad de saltar a página específica).

Aplica este hook + componente a las listas existentes de ingresos, gastos y a la nueva tabla de reportes, para no duplicar lógica de orden/paginación en cada lista.

## 6. Categorías Personalizables

Reemplaza las categorías fijas de gasto (`Arriendo`, `Alimentación`, `Transporte`, `Seguridad social`) por una lista editable:
- Nueva slice `categories` en el reducer, inicializada con las categorías actuales como "no eliminables por defecto" pero sí renombrables, más la posibilidad de agregar categorías custom.
- Componente `CategoryManagerModal.jsx`: modal reutilizable desde el formulario de gastos, ingresos y reglas recurrentes (botón "Gestionar categorías" junto al selector de categoría) para agregar/eliminar categorías sin salir del formulario.
- Actualiza `ExpenseForm.jsx` e `IncomeForm.jsx` para leer las categorías desde el estado en vez de una lista hardcodeada.

## 7. Calculadora Flotante

Componente `FloatingCalculator.jsx`: widget flotante y arrastrable (usa Framer Motion `drag` en vez de lógica manual de mousedown/mousemove) accesible desde cualquier pantalla vía un botón fijo en la esquina o en `NavTabs.jsx`. Operaciones básicas (+, -, ×, ÷, %, limpiar), display de expresión y resultado, cerrable con Escape o botón X. No necesita persistir estado entre sesiones.

## 8. PWA (Instalable + Offline)

- Agrega `public/manifest.json` con nombre, íconos (reutiliza `favicon.svg`/`icons.svg` existentes o genera versiones PNG 192x192 y 512x512 si hace falta), `theme_color` acorde a la paleta ya usada en modo oscuro, y `display: standalone`.
- Registra un Service Worker (`public/sw.js` o vía plugin `vite-plugin-pwa` si prefieres una solución más robusta y mantenible que un SW manual) con estrategia cache-first para los assets estáticos del build, para que la app funcione offline después de la primera carga.
- Enlaza el manifest y registra el SW desde `index.html` / `main.jsx` según corresponda con Vite.
- Indica si usas `vite-plugin-pwa` el comando de instalación y la configuración necesaria en `vite.config.js`.

## 9. Integración General

- Todas las nuevas slices de estado (`pockets`, `recurringRules`, `categories`) deben seguir el mismo patrón que las existentes: reducer + persistencia en `useEffect` + acciones tipadas por `action.type`.
- Actualiza `useFinanceSummary.js` para que el cálculo de "Flujo de Caja Libre" siga siendo correcto incluyendo (o excluyendo explícitamente, según corresponda semánticamente) los aportes a bolsillos y las nuevas transacciones recurrentes generadas.
- Mantén el modo oscuro y las animaciones Framer Motion consistentes en todos los componentes nuevos.
- No rompas nada de lo ya construido: TRM/histórico, deudas con cuotas, gráfico de pastel de distribución, tracker de chips, montaña/anillos/carretera de progreso de deuda.

## 10. Entregable

1. Lista de archivos nuevos y modificados con descripción breve de cada cambio.
2. Código completo de cada archivo nuevo o modificado, listo para copiar y pegar.
3. Comandos de instalación si se requiere alguna librería nueva (ej. `vite-plugin-pwa`).
4. Checklist final de pruebas manuales: crear un bolsillo y agregarle un aporte, crear una regla recurrente y verificar que genere transacciones futuras sin duplicar, filtrar y exportar un reporte a PDF, exportar/importar un backup JSON, borrar todos los datos, ordenar y paginar una tabla, agregar/eliminar una categoría custom, usar la calculadora flotante, e instalar la app como PWA y verificar que cargue offline tras la primera visita.
