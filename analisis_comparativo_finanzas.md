# Análisis comparativo: tu app de finanzas vs. la de tu papá (jorgpadi/finanzas)

## Qué se revisó

Por un lado, tu proyecto React en este workspace (`AppContext.jsx`, `DebtManager.jsx`, `DebtPayoffMountain/Ring/Roadmap`, `TrmHistoryChart`, hooks `useFinanceSummary`/`useDebtProgress`/`useTrmHistory`, Tailwind + Framer Motion + Recharts). Por otro, el repositorio publicado en `https://jorgpadi.github.io/finanzas/`, analizado a partir de la carpeta descomprimida (`index.html`, `js/app.js` de 1099 líneas, `css/styles.css`, `manifest.json`, `sw.js`).

Antes de entrar en el cruce, un dato importante para calibrar la conclusión: son dos stacks completamente distintos. Tu app es React + Vite + Tailwind + Context/reducer + hooks; la de tu papá es JavaScript vanilla manipulando el DOM directamente, con Chart.js y un objeto global `appData`. No hay una sola línea de código compartida ni estructura de archivos parecida, así que si algo se "copió" fue a nivel de idea/funcionalidad, nunca de código. Tampoco tuve acceso al historial de commits de ninguno de los dos proyectos, así que no puedo afirmar con certeza quién influenció a quién ni en qué orden ocurrieron los cambios — lo que sigue es una comparación de lo que existe hoy en cada proyecto, no un veredicto de autoría.

## Lo que su app tiene y la tuya no

La app de tu papá resultó más completa de lo esperado en varios frentes operativos:

**Bolsillos / Inversiones.** Es un módulo de metas de ahorro genérico (nombre, tipo, valor actual, meta opcional, fecha de vencimiento) con un historial de aportes por bolsillo y un modal de detalle que muestra un doughnut chart de "acumulado vs. faltante para la meta" con el porcentaje calculado. Tu app no tiene nada equivalente para ahorro/inversión — solo maneja deudas.

**Programación (motor de recurrencia genérico).** Permite definir una regla una sola vez (tipo ingreso o gasto, categoría, valor, frecuencia semanal/quincenal/mensual, rango de fechas) y el sistema genera automáticamente todas las transacciones futuras dentro de ese rango. Es conceptualmente parecido a como tu generas las cuotas de una deuda mes a mes, pero más general: sirve para cualquier ingreso o gasto recurrente, no solo deudas.

**Reportes con filtros + exportación a PDF.** Filtro por tipo, categoría, texto libre y rango de fechas (con atajos "mes actual", "mes pasado", "año actual"), tabla de resultados, gráfico de barras ingresos vs. gastos, doughnut por categoría, y botón de impresión a PDF vía `window.print()`.

**Backup/restore.** Exportar todo `appData` a un archivo JSON descargable, e importarlo de vuelta. Tu app no tiene ninguna forma de sacar los datos del navegador.

**Gestión de categorías editable.** Modal para agregar/eliminar categorías custom, reutilizado en ingresos, gastos, programación y reportes. Tus categorías de gasto fijo están hardcodeadas (Arriendo, Alimentación, Transporte, Seguridad social).

**Tablas con orden y paginación.** Cualquier columna es clickeable para ordenar asc/desc, y las listas (movimientos, ingresos, gastos) tienen paginación estilo Mercado Libre con selector de tamaño de página.

**Calculadora flotante arrastrable**, accesible desde el sidebar en cualquier sección.

**PWA real.** `manifest.json` + `sw.js` con cache-first: la app es instalable en escritorio/celular y funciona offline. Tu build de Vite no tiene manifest ni service worker configurados todavía.

**Personalización de marca.** Nombre del propietario y título del reporte editables desde Configuración, reflejados en el sidebar y en el `<title>`.

## Lo que tu diseño tiene y el suyo no

Tu app resuelve un problema que la suya ni siquiera contempla: **doble moneda**. Todo el proyecto de tu papá está en COP puro — no hay TRM, no hay USD, no hay tasa de cambio en ningún lado del código. Tu sistema de TRM diaria con histórico y gráfico tipo Google Finance no tiene equivalente ahí.

En deudas, tu modelo es más preciso: cada deuda tiene un plan de cuotas explícito (número, mes, estado pagada/pendiente/atrasada, fecha de pago), lo que te permite saber exactamente cuántas cuotas faltan y cuándo termina cada una. Su "Programación" genera gastos recurrentes genéricos, pero no lleva un registro de cuál cuota específica está pagada o atrasada — solo genera las transacciones y ya.

Tu visualización de progreso de deuda (montaña, anillos, carretera) es sustancialmente más rica que el único doughnut "acumulado vs. meta" que él usa para bolsillos. Es el mismo patrón visual base (donut de progreso), pero tú lo llevaste a tres vistas complementarias con animación.

En cuanto a interfaz: tienes modo oscuro nativo y animaciones fluidas con Framer Motion; su app es tema claro fijo, sin dark mode, con transiciones CSS básicas. Y en arquitectura, tu estado centralizado con reducer + Context y hooks derivados (`useFinanceSummary`, `useDebtProgress`, `useTrmHistory`) es más mantenible que las variables globales sueltas (`appData`, `paginationState`, `sortState`) que él actualiza directamente en `js/app.js`. Tu migración de datos versionada (`loadDebtsWithMigration`) también es más robusta que el `Object.assign` simple que él usa al cargar `localStorage`.

## El cruce, feature por feature

| Funcionalidad | Tu app (React) | App de tu papá (Vanilla JS) |
|---|---|---|
| Doble moneda USD/COP + TRM histórica | Sí, con gráfico tipo Google Finance | No existe |
| Deudas con plan de cuotas individual | Sí (fecha y estado por cuota) | Parcial, vía Programación genérica sin estado por cuota |
| Metas de ahorro / inversión (bolsillos) | No existe | Sí, con historial de aportes |
| Gráfico de distribución gasto/ingreso | Sí (pastel fijos/variables/deudas vs. ingreso) | Sí (doughnut por categoría en Reportes) |
| Visualización de progreso | Sí, 3 vistas (montaña/anillos/carretera) | Sí, 1 doughnut simple por bolsillo |
| Transacciones recurrentes genéricas | No (solo cuotas de deuda) | Sí (mensual/quincenal/semanal, cualquier categoría) |
| Reportes filtrables + exportar PDF | No existe | Sí |
| Backup/restore en JSON | No existe | Sí |
| Categorías personalizables | No (fijas) | Sí, editables |
| Orden de tablas + paginación | No existe | Sí |
| Calculadora flotante | No existe | Sí |
| PWA instalable / funciona offline | No existe | Sí |
| Modo oscuro | Sí | No |
| Animaciones fluidas | Sí (Framer Motion) | Básicas (CSS) |
| Arquitectura de estado | Reducer + Context + hooks | Variables globales + funciones |

## Sobre si "te copió"

Con lo que tengo disponible no puedo confirmarlo ni descartarlo. Los dos puntos de mayor parecido conceptual son el doughnut de "acumulado vs. meta" en Bolsillos (que recuerda a tu idea de anillo de progreso de deuda) y el motor de Programación (que recuerda a tu generación automática de cuotas mes a mes). Pero ambos son patrones bastante estándar en cualquier app de finanzas personales — un gauge circular de progreso y una regla de recurrencia que genera transacciones futuras no son ideas exclusivas de ningún diseño particular, así que también pudo llegar a ellas de forma independiente. Sin el historial de commits de su repo no hay forma de establecer cronología real.

## Siguiente paso posible

Si quieres, puedo armarte un mega prompt (como los anteriores) para llevar a tu app React las piezas que su proyecto sí tiene y la tuya no: módulo de Bolsillos/metas de ahorro, motor de recurrencia genérico, reportes filtrables con exportación a PDF, backup/restore en JSON, gestión de categorías editable, orden+paginación de tablas, y configuración de PWA (manifest + service worker). Dime si quieres que lo prepare y si hay alguna de esas que te interese priorizar primero.
