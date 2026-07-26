# Mega Prompt — Visualización de Progreso de Cumplimiento de Deudas (Claude en VS Code)

Actúa como un Ingeniero Frontend Senior especializado en React, Recharts/Chart.js, Framer Motion y diseño de data visualization. Vas a añadir un **sistema de visualización de progreso de deudas** al proyecto existente de registro financiero personal, que ya cuenta con: modelo de deudas con cuotas (`cuotas[]`, estados `pendiente/pagada/atrasada`), tracker de chips (`DebtInstallmentTracker.jsx`), TRM histórica y dashboard con gráfico de pastel.

Lee primero el modelo de datos de deudas actual (`debts_v2` en localStorage, con su arreglo de `cuotas`) para construir esta visualización sobre datos reales, sin duplicar lógica de cálculo ya existente (reutiliza o extiende los hooks que ya calculan saldos y cuotas pagadas/pendientes).

## Concepto de Diseño (justificación breve)

En vez de un único gráfico, se diseñan **tres vistas complementarias**, cada una respondiendo una pregunta distinta que el usuario se hace sobre sus deudas:

1. **"¿Cómo va mi deuda total en el tiempo?"** → Gráfico de montaña que se derrite (Debt Payoff Mountain).
2. **"¿Qué tan cerca estoy de terminar CADA deuda?"** → Gauges circulares individuales (Payoff Rings).
3. **"¿Qué tan rápido/constante he sido pagando?"** → Línea de tiempo tipo carretera con hitos (Payoff Roadmap).

Implementa las tres como componentes independientes, ensamblados en una nueva sección `DebtProgressOverview.jsx` dentro del módulo de Deudas (por ejemplo, arriba de la lista de tarjetas de deuda individuales, o en un tab "Progreso").

---

## 1. Debt Payoff Mountain (vista global)

Componente: `DebtPayoffMountain.jsx`. Gráfico de área (Recharts `AreaChart`) con eje X = meses (desde la fecha de inicio de la deuda más antigua hasta la fecha de finalización de la deuda más larga) y eje Y = saldo total de deuda pendiente en COP (suma de todas las deudas activas).

- **Línea sólida histórica**: saldo real restante mes a mes, calculado a partir de las cuotas ya marcadas como `pagada` hasta la fecha actual (la "montaña" baja escalonadamente cada vez que se paga una cuota).
- **Línea punteada de proyección**: desde el mes actual hacia adelante, mostrando cómo bajaría el saldo si todas las cuotas futuras se pagan a tiempo según el plan.
- **Degradado de área** rojo→naranja→verde a medida que el saldo baja (usa 2-3 `stop` en el `linearGradient` para transmitir "entre más baja la montaña, más cerca de la libertad financiera").
- Anotación en el punto "hoy" (línea vertical de referencia + etiqueta "Hoy: $X restante").
- Tooltip al hover mostrando: mes, saldo total restante, y desglose por deuda individual (si hay más de una deuda activa) en formato de mini lista dentro del tooltip.
- Si el usuario paga una cuota y esto hace que una deuda se complete antes de lo proyectado, la línea histórica debe reflejarlo inmediatamente (recalcular, no hardcodear).
- Debajo del gráfico, mostrar 3 mini-stats: "Pagado hasta hoy: $X", "Restante: $Y", "% de tu deuda total ya eliminado".

## 2. Payoff Rings (gauges circulares por deuda)

Componente: `DebtPayoffRing.jsx`, uno por cada deuda activa, mostrado en un grid horizontal con scroll si hay muchas deudas.

- **Anillo circular (donut/radial progress)** usando `RadialBarChart` de Recharts o un SVG custom con `stroke-dasharray`, mostrando el % de cuotas pagadas.
- En el centro del anillo: número grande con el % (ej. "58%") y debajo, en texto pequeño, "7 de 12 cuotas".
- Color del anillo dinámico según el % (mismo criterio semántico que el tracker de chips: rojo <30%, amarillo 30-70%, verde >70%), con transición de color animada (no un salto brusco) a medida que sube el %.
- Animación de "llenado" del anillo con Framer Motion o CSS al montar el componente o al marcar una nueva cuota como pagada (el anillo debe crecer suavemente hacia el nuevo valor, no saltar instantáneamente).
- Debajo del anillo: nombre de la deuda y "Termina: [mes/año estimado]".
- Cuando una deuda llega a 100%, el anillo se vuelve dorado/verde brillante con un pequeño efecto de celebración (ej. confetti breve con `canvas-confetti` o una animación de "pulso" + ícono de trofeo/check), y la tarjeta puede moverse visualmente hacia la sección de "Deudas completadas".

## 3. Payoff Roadmap (línea de tiempo con hitos)

Componente: `DebtPayoffRoadmap.jsx`, uno por deuda (visible al expandir el detalle de una deuda específica, o como fila horizontal debajo del tracker de chips existente).

- Representa la deuda como una **carretera horizontal** (barra larga) dividida conceptualmente en 4 hitos: 25%, 50%, 75%, 100%.
- En cada hito, un ícono/bandera marcador. El tramo de la carretera ya recorrido se pinta de color sólido (verde), el tramo restante en gris/punteado.
- Un ícono de "posición actual" (ej. un pin o avatar simple) se ubica en el punto exacto del % pagado y se anima deslizándose suavemente hacia la derecha cada vez que se paga una nueva cuota (no salto instantáneo — usa transición o Framer Motion `layout`/`animate`).
- Al pasar el mouse sobre un hito (25/50/75/100%), mostrar tooltip con la fecha estimada o real en que se alcanzó/alcanzará ese hito.
- Si una deuda está `atrasada` (alguna cuota vencida sin pagar), el ícono de posición actual debe mostrar un indicador visual de alerta (ej. anillo pulsante rojo) sin mover la posición hacia adelante hasta que se registre el pago.

## 4. Datos y Cálculos (reutilizables)

Crea o extiende un hook `useDebtProgress()` que retorne, a partir del array de deudas (`debts_v2`):

```js
{
  totalDeudaOriginal: number,
  totalPagadoHastaHoy: number,
  totalRestante: number,
  porcentajeGlobalCompletado: number,
  seriePorMes: [ { mes: 'YYYY-MM', saldoRestante: number, esProyeccion: boolean } ],
  progresoPorDeuda: [
    {
      id, nombre,
      porcentajeCompletado: number,
      cuotasPagadas: number,
      cuotasTotal: number,
      mesEstimadoFin: string,
      estado: 'activa' | 'completada' | 'atrasada'
    }
  ]
}
```

Este hook centraliza la lógica para que los tres componentes (`Mountain`, `Rings`, `Roadmap`) consuman los mismos datos derivados, evitando cálculos duplicados o inconsistentes entre gráficos.

## 5. Integración y Consistencia Visual

- Reutiliza la paleta de colores ya definida en el proyecto para estados de deuda (verde = pagada/al día, rojo/naranja = atrasada, gris = pendiente) para que los tres gráficos nuevos se sientan parte del mismo sistema, no widgets aislados.
- Todos los componentes deben respetar el modo oscuro existente.
- Añade transiciones de entrada (fade + slide sutil con Framer Motion) al montar `DebtProgressOverview.jsx`.
- Si el usuario no tiene ninguna deuda activa, muestra un estado vacío alentador (ej. ilustración simple o mensaje: "🎉 No tienes deudas activas registradas. ¡Cuando agregues una, verás aquí tu progreso!").
- Estos gráficos deben actualizarse en tiempo real (sin recargar página) cuando el usuario marca/desmarca una cuota como pagada desde `DebtInstallmentTracker.jsx`.

## 6. Entregable

1. Lista de archivos nuevos y modificados, con descripción breve de cada uno.
2. Código completo de cada componente (`DebtPayoffMountain.jsx`, `DebtPayoffRing.jsx`, `DebtPayoffRoadmap.jsx`, `DebtProgressOverview.jsx`, hook `useDebtProgress.js`), listo para copiar y pegar.
3. Indica el/los comando(s) de instalación si se requiere una librería nueva (ej. `canvas-confetti`).
4. Checklist final de pruebas manuales: verificar que la montaña baje correctamente al marcar cuotas como pagadas, que los anillos animen su llenado y disparen la celebración al 100%, que el roadmap mueva el pin correctamente y marque alerta en cuotas atrasadas, y que todo se vea coherente en modo oscuro y en mobile.
