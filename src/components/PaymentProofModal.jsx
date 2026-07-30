import { useState } from 'react'
import PropTypes from 'prop-types'
import { UploadCloud, FileCheck2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from './Modal'
import { formatCOP, formatMonthKey } from '../utils/format'

/** Gate for marking a cuota as pagada: no file, no confirm button — enforced here, not just by convention. */
export default function PaymentProofModal({ open, onClose, cuota, onConfirm }) {
  const { state } = useApp()
  const [file, setFile] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function handleClose() {
    if (saving) return
    setFile(null)
    setPaymentMethod('')
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!file) {
      setError('Adjunta un comprobante (foto o PDF) para poder marcar la cuota como pagada.')
      return
    }
    if (!paymentMethod) {
      setError('Indica de dónde salió el dinero para esta cuota.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onConfirm(file, paymentMethod)
      setFile(null)
      setPaymentMethod('')
    } catch {
      setError('No se pudo guardar el comprobante en este navegador. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Adjuntar comprobante de pago" widthClassName="max-w-sm">
      {cuota && (
        <p className="mb-3 text-sm text-slate-400">
          Cuota {cuota.numero} · {formatMonthKey(cuota.mes)} ·{' '}
          <span className="font-semibold text-slate-200">{formatCOP(cuota.montoEsperado)}</span>
        </p>
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400 transition-colors duration-200 hover:border-emerald-600 hover:text-slate-200">
        {file ? <FileCheck2 size={22} className="text-emerald-400" /> : <UploadCloud size={22} />}
        <span className="break-all">{file ? file.name : 'Selecciona una imagen o PDF del comprobante'}</span>
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            if (error) setError(null)
          }}
        />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
        ¿De dónde salió el dinero?
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value)
            if (error) setError(null)
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">Selecciona una cuenta o medio de pago…</option>
          {state.paymentMethods.map((method) => (
            <option key={method.id} value={method.nombre}>
              {method.nombre}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <p className="mt-2 text-[11px] text-slate-600">
        Sin comprobante no es posible marcar esta cuota como pagada. El archivo se guarda solo en
        este navegador.
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!file || saving}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Guardando…' : 'Marcar cuota como pagada'}
      </button>
    </Modal>
  )
}

PaymentProofModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cuota: PropTypes.shape({
    numero: PropTypes.number,
    mes: PropTypes.string,
    montoEsperado: PropTypes.number,
  }),
  onConfirm: PropTypes.func.isRequired,
}

PaymentProofModal.defaultProps = {
  cuota: null,
}
