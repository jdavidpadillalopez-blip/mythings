import { useState } from 'react'
import PropTypes from 'prop-types'
import { Plus, Trash2, Pencil, Check, X, Tags } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from './Modal'

/**
 * Generic "manage a flat list of named tags" modal — add / rename / delete, with defaults that
 * can be renamed but not removed. Originally written just for expense categories; now also backs
 * income sources and payment methods, so behavior lives here once and each caller (see
 * CategoryManagerModal/IncomeSourceManagerModal/PaymentMethodManagerModal) just supplies which
 * state slice and action types to dispatch.
 */
export default function TagManagerModal({
  open,
  onClose,
  title,
  items,
  placeholder,
  addAction,
  renameAction,
  deleteAction,
}) {
  const { dispatch } = useApp()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Escribe un nombre')
      return
    }
    setError(null)
    dispatch({ type: addAction, payload: { id: crypto.randomUUID(), nombre: name.trim(), isDefault: false } })
    setName('')
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditingName(item.nombre)
  }

  function saveEdit() {
    if (editingName.trim()) {
      dispatch({ type: renameAction, payload: { id: editingId, nombre: editingName.trim() } })
    }
    setEditingId(null)
  }

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-md">
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus size={16} />
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <Tags size={14} className="shrink-0 text-slate-500" />
            {editingId === item.id ? (
              <>
                <input
                  autoFocus
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
                <button type="button" onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300">
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-slate-200">{item.nombre}</span>
                {item.isDefault && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-600">predeterminada</span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-slate-500 transition-colors duration-200 hover:text-slate-200"
                  aria-label="Renombrar"
                >
                  <Pencil size={14} />
                </button>
                {!item.isDefault && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: deleteAction, payload: item.id })}
                    className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  )
}

TagManagerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string.isRequired, nombre: PropTypes.string.isRequired, isDefault: PropTypes.bool }),
  ).isRequired,
  placeholder: PropTypes.string,
  addAction: PropTypes.string.isRequired,
  renameAction: PropTypes.string.isRequired,
  deleteAction: PropTypes.string.isRequired,
}

TagManagerModal.defaultProps = {
  placeholder: 'Nuevo elemento',
}
