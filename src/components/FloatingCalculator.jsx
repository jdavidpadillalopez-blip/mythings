import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calculator, X } from 'lucide-react'

function formatResult(value) {
  if (!Number.isFinite(value)) return 'Error'
  const rounded = Math.round(value * 1e10) / 1e10
  return String(rounded)
}

function compute(a, b, op) {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
    default:
      return b
  }
}

const BUTTON_CLASS =
  'flex h-11 items-center justify-center rounded-lg bg-slate-800 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-slate-700 active:scale-95'
const OP_BUTTON_CLASS =
  'flex h-11 items-center justify-center rounded-lg bg-emerald-600/80 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-500 active:scale-95'

export default function FloatingCalculator() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [accumulator, setAccumulator] = useState(null)
  const [operator, setOperator] = useState(null)
  const [expression, setExpression] = useState('')
  const [overwrite, setOverwrite] = useState(true)

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function clearAll() {
    setDisplay('0')
    setAccumulator(null)
    setOperator(null)
    setExpression('')
    setOverwrite(true)
  }

  function inputDigit(digit) {
    if (overwrite) {
      setDisplay(digit)
      setOverwrite(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  function inputDecimal() {
    if (overwrite) {
      setDisplay('0.')
      setOverwrite(false)
      return
    }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  function chooseOperator(op) {
    const current = Number(display)
    if (accumulator !== null && operator && !overwrite) {
      const result = compute(accumulator, current, operator)
      setAccumulator(result)
      setDisplay(formatResult(result))
      setExpression(`${formatResult(result)} ${op}`)
    } else {
      setAccumulator(current)
      setExpression(`${formatResult(current)} ${op}`)
    }
    setOperator(op)
    setOverwrite(true)
  }

  function applyPercent() {
    setDisplay(formatResult(Number(display) / 100))
    setOverwrite(false)
  }

  function equals() {
    if (operator === null || accumulator === null) return
    const current = Number(display)
    const result = compute(accumulator, current, operator)
    setExpression(`${formatResult(accumulator)} ${operator} ${formatResult(current)} =`)
    setDisplay(formatResult(result))
    setAccumulator(null)
    setOperator(null)
    setOverwrite(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 transition-transform duration-200 hover:scale-105 print:hidden"
        aria-label="Abrir calculadora"
      >
        <Calculator size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-5 z-40 w-64 cursor-grab rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl active:cursor-grabbing print:hidden"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Calculadora
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 transition-colors duration-200 hover:text-slate-200"
                aria-label="Cerrar calculadora"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="h-4 truncate text-xs text-slate-500">{expression || ' '}</p>
              <p className="truncate text-2xl font-semibold text-slate-50">{display}</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={clearAll} className={`${BUTTON_CLASS} col-span-2`}>
                Limpiar
              </button>
              <button type="button" onClick={applyPercent} className={BUTTON_CLASS}>
                %
              </button>
              <button type="button" onClick={() => chooseOperator('÷')} className={OP_BUTTON_CLASS}>
                ÷
              </button>

              {['7', '8', '9'].map((d) => (
                <button key={d} type="button" onClick={() => inputDigit(d)} className={BUTTON_CLASS}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => chooseOperator('×')} className={OP_BUTTON_CLASS}>
                ×
              </button>

              {['4', '5', '6'].map((d) => (
                <button key={d} type="button" onClick={() => inputDigit(d)} className={BUTTON_CLASS}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => chooseOperator('-')} className={OP_BUTTON_CLASS}>
                -
              </button>

              {['1', '2', '3'].map((d) => (
                <button key={d} type="button" onClick={() => inputDigit(d)} className={BUTTON_CLASS}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => chooseOperator('+')} className={OP_BUTTON_CLASS}>
                +
              </button>

              <button type="button" onClick={() => inputDigit('0')} className={BUTTON_CLASS}>
                0
              </button>
              <button type="button" onClick={inputDecimal} className={BUTTON_CLASS}>
                .
              </button>
              <button type="button" onClick={equals} className={`${OP_BUTTON_CLASS} col-span-2`}>
                =
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
