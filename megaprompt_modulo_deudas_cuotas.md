# Mega Prompt — Módulo de Deudas con Seguimiento de Cuotas (Claude en VS Code)

Actúa como un Ingeniero Frontend/Full Stack Senior especializado en React, Tailwind CSS y modelado de estado con localStorage. Vas a intervenir el módulo de **Deudas** de un proyecto existente de registro financiero personal (Ingresos en USD, Gastos en COP, TRM diaria, Gastos Fijos/Variables). No reescribas la app completa: **refactoriza solo lo necesario** en el modelo de datos de deudas, el componente `DebtManager.jsx` (o equivalente) y su integración con gastos fijos y el gráfico de pastel.

Antes de programar, lee el código actual de la sección de deudas, el estado global/contexto, y cómo se integran hoy las cuotas de deuda dentro de los gastos fijos mensuales, para no romper esa integración.

## 1. Objetivo General
Cada deuda debe convertirse en un **plan de pagos completo**, no solo en "una cuota mensual recurrente". El usuario define cuántas cuotas tiene la deuda en total, y la app debe llevar un registro visual y persistente de qué cuotas están pagadas, cuál es la cuota actual/pendiente, y debe generar automáticamente el registro mes a mes hasta que la deuda quede saldada en su totalidad.

## 2. Nuevo Modelo de Datos de Deuda

Actualiza (o crea) el modelo de cada deuda para incluir:

```js
{
  id: string,
  nombre: string,               // Ej: "Tarjeta de Crédito Bancolombia"
  montoTotal: number,           // Saldo total de la deuda en COP
  cuotaMensual: number,         // Valor de cada cuota en COP
  numeroCuotasTotal: number,    // Ej: 12
  fechaInicio: string,          // Fecha de la primera cuota (YYYY-MM-DD)
  cuotas: [
    {
      numero: number,          // 1, 2, 3...
      mes: string,              // "2026-08", derivado de fechaInicio + offset
      montoEsperado: number,    // normalmente = cuotaMensual (permite ajustar la última cuota si no es exacta)
      estado: 'pendiente' | 'pagada' | 'atrasada',
      fechaPago: string | null // se llena cuando el usuario marca la cuota como pagada
    },
    ...
  ],
  estadoGeneral: 'activa' | 'completada'
}
```

Reglas de generación:
- Al crear la deuda, calcula automáticamente el arreglo `cuotas` completo (de la 1 a `numeroCuotasTotal`), con sus meses correspondientes a partir de `fechaInicio`.
- Si `montoTotal` no es exactamente divisible por `numeroCuotasTotal`, ajusta la última cuota para que la suma total cuadre exactamente con `montoTotal` (evita descuadres por redondeo).
- Cuando el mes actual del sistema coincide o supera el mes de una cuota `pendiente` y esta no ha sido marcada como pagada, cambia su estado visual a `atrasada` (solo como indicador, sin bloquear el flujo).
- Cuando todas las cuotas quedan en `pagada`, `estadoGeneral` pasa a `'completada'` automáticamente.

## 3. Componente Visual: Tracker de Cuotas

Crea un componente `DebtInstallmentTracker.jsx` que se muestre dentro de cada tarjeta de deuda, con:

- **Barra de progreso** mostrando `cuotas pagadas / total de cuotas` (ej. "5 de 12 cuotas pagadas") con porcentaje y color dinámico (rojo si <30%, amarillo si 30–70%, verde si >70%).
- **Grid de cuotas individuales** (estilo "chips" o "dots" numerados del 1 al N): cada cuota es un cuadrito/círculo pequeño que cambia de color según su estado:
  - Verde sólido = pagada
  - Gris = pendiente (futura)
  - Naranja/rojo = atrasada (mes ya pasó y no se marcó como pagada)
  - Un leve resaltado/anillo en la cuota "actual" (la próxima a pagar)
- Al hacer clic sobre una cuota pendiente o atrasada, debe poder marcarse como **pagada** (esto registra `fechaPago` con la fecha actual del sistema, salvo que el usuario edite la fecha manualmente).
- Debe poder deshacerse (marcar una cuota pagada como pendiente de nuevo) por si el usuario se equivocó.
- Mostrar debajo del tracker: "Saldo restante: $X COP" (suma de cuotas no pagadas) y "Fecha estimada de finalización" (mes de la última cuota).
- Cuando `estadoGeneral` pasa a `'completada'`, la tarjeta de la deuda debe mostrar un badge/etiqueta visual de "✅ Deuda saldada" y moverse (o poder filtrarse) a una sección de "Deudas completadas", separada de las "Deudas activas".

## 4. Registro Mes a Mes e Integración con Gastos Fijos

- El total de "Gastos Fijos por Deudas" del mes actual debe calcularse dinámicamente sumando **solo las cuotas cuyo campo `mes` corresponde al mes en curso** y cuyo estado sea `pendiente`, `atrasada`, o recién marcada `pagada` ese mismo mes (es decir, la cuota del mes activo siempre cuenta como gasto fijo del mes, se haya pagado ya o no).
- Deudas con `estadoGeneral: 'completada'` no deben seguir sumando al cálculo de gastos fijos futuros.
- Actualiza el hook o función que calcula "Total Gastos Fijos" (usado en las tarjetas resumen y en el gráfico de pastel) para que tome las cuotas del mes activo de todas las deudas `activa`, en vez de un valor fijo por deuda.
- Si el usuario cambia de mes en la vista (si existe selector de mes) o simplemente entra otro día, el cálculo debe recalcular automáticamente qué cuotas corresponden a ese mes.

## 5. Formulario de Creación/Edición de Deuda

Actualiza el formulario para incluir:
- Nombre de la deuda
- Monto total (COP)
- Número de cuotas totales
- Fecha de inicio (primera cuota)
- Cálculo en vivo mostrado debajo del formulario: "Cuota mensual estimada: $X COP" (montoTotal / numeroCuotasTotal), editable manualmente si el usuario quiere fijar un valor de cuota distinto (por ejemplo por intereses), recalculando entonces el número de cuotas o el monto de la última cuota.
- Validaciones: montoTotal > 0, numeroCuotasTotal entero > 0, fechaInicio válida.
- Al editar una deuda existente que ya tiene cuotas pagadas, advertir al usuario si el cambio de monto/número de cuotas afectaría cuotas ya marcadas como pagadas, y pedir confirmación antes de regenerar el plan de cuotas.

## 6. Persistencia

- Guarda el array completo de deudas (con su detalle de cuotas) en `localStorage` bajo una clave clara (ej. `debts_v2`), migrando datos del formato anterior si existía uno más simple (deuda con una sola cuota mensual sin desglose), para no perder información ya cargada por el usuario.
- Escribe una función de migración `migrateLegacyDebts()` que se ejecute una sola vez al cargar la app si detecta el formato viejo, generando automáticamente el arreglo de `cuotas` a partir de los datos disponibles (si no hay número de cuotas registrado previamente, asumir un valor por defecto razonable como 12 y avisar al usuario para que lo ajuste).

## 7. Entregable

1. Lista de archivos nuevos y modificados con breve descripción de cada cambio.
2. Código completo de cada archivo nuevo o modificado, listo para copiar y pegar.
3. Explicación breve de la lógica de generación y actualización de cuotas (para que quede documentado en el propio código con comentarios).
4. Checklist final de pruebas manuales: crear una deuda nueva, marcar/desmarcar cuotas como pagadas, verificar que el gráfico de pastel y las tarjetas resumen reflejen solo la cuota del mes activo, verificar que una deuda se marque como completada al pagar la última cuota, y verificar que la migración de datos antiguos no rompa deudas ya existentes.
