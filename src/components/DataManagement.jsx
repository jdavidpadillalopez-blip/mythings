import { useRef, useState } from 'react'
import { Download, Upload, Trash2, DatabaseBackup } from 'lucide-react'
import { useApp, isValidImportedState, STORAGE_KEY } from '../context/AppContext'
import { clearDebtsStorage } from '../utils/debts'
import { clearTrmHistory } from '../utils/trmHistory'
import Modal from './Modal'

function todayFileDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function DataManagement() {
  const { state, dispatch } = useApp()
  const fileInputRef = useRef(null)
  const [pendingImport, setPendingImport] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  function handleExport() {
    const payload = {
      trm: state.trm,
      incomes: state.incomes,
      debts: state.debts,
      fixedExpenses: state.fixedExpenses,
      variableExpenses: state.variableExpenses,
      pockets: state.pockets,
      recurringRules: state.recurringRules,
      recurringTransactions: state.recurringTransactions,
      categories: state.categories,
      incomeSources: state.incomeSources,
      paymentMethods: state.paymentMethods,
      paymentHistory: state.paymentHistory,
      archivedDebts: state.archivedDebts,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `respaldo_finanzas_${todayFileDate()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setMessage('Respaldo descargado correctamente.')
    setError(null)
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isValidImportedState(parsed)) {
          setError('El archivo no tiene el formato esperado de un respaldo de esta app.')
          return
        }
        setError(null)
        setPendingImport(parsed)
      } catch {
        setError('No se pudo leer el archivo — asegúrate de que sea un JSON válido exportado desde aquí.')
      }
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    dispatch({ type: 'IMPORT_STATE', payload: pendingImport })
    setPendingImport(null)
    setMessage('Datos importados correctamente.')
  }

  function confirmDeleteAll() {
    localStorage.removeItem(STORAGE_KEY)
    clearDebtsStorage()
    clearTrmHistory()
    dispatch({ type: 'RESET_ALL' })
    setShowDeleteConfirm(false)
    setMessage('Todos los datos fueron borrados.')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
          <DatabaseBackup size={16} />
          Respaldo y datos
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
          >
            <Download size={16} />
            Exportar datos
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors duration-200 hover:border-slate-500"
          >
            <Upload size={16} />
            Importar datos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-400 transition-colors duration-200 hover:border-red-500 hover:bg-red-950/30"
          >
            <Trash2 size={16} />
            Borrar todos los datos
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}

        <p className="mt-4 text-xs text-slate-500">
          El respaldo incluye ingresos, deudas (activas y archivadas), gastos fijos y variables,
          bolsillos, reglas recurrentes, historial de pagos y la TRM activa. Se guarda como un
          archivo <code>.json</code> que puedes importar de vuelta en cualquier momento, incluso en
          otro dispositivo. Los archivos de comprobantes en sí (fotos/PDFs) no viajan en este
          respaldo — quedan guardados en el navegador donde los subiste.
        </p>
      </div>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Confirmar importación"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-slate-300">
          Esto reemplazará todos tus datos actuales por los del archivo importado. Esta acción no se
          puede deshacer. ¿Deseas continuar?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingImport(null)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors duration-200 hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmImport}
            className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
          >
            Sí, reemplazar
          </button>
        </div>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Borrar todos los datos"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-slate-300">
          Vas a borrar permanentemente todos tus ingresos, deudas, gastos, bolsillos, reglas
          recurrentes e histórico de TRM guardados en este navegador. Esta acción no se puede
          deshacer. ¿Continuar?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors duration-200 hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmDeleteAll}
            className="rounded-lg bg-red-600/90 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-500"
          >
            Sí, borrar todo
          </button>
        </div>
      </Modal>
    </div>
  )
}
