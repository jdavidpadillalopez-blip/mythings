import { useState } from 'react'
import PropTypes from 'prop-types'
import { Plus, Trash2, Pencil, Check, X, Tags } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from './Modal'

export default function CategoryManagerModal({ open, onClose }) {
  const { state, dispatch } = useApp()
  const { categories } = state
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Escribe un nombre de categoría')
      return
    }
    setError(null)
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { id: crypto.randomUUID(), nombre: name.trim(), isDefault: false },
    })
    setName('')
  }

  function startEdit(category) {
    setEditingId(category.id)
    setEditingName(category.nombre)
  }

  function saveEdit() {
    if (editingName.trim()) {
      dispatch({ type: 'RENAME_CATEGORY', payload: { id: editingId, nombre: editingName.trim() } })
    }
    setEditingId(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Gestionar categorías" widthClassName="max-w-md">
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Nueva categoría"
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
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <Tags size={14} className="shrink-0 text-slate-500" />
            {editingId === category.id ? (
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
                <span className="flex-1 text-slate-200">{category.nombre}</span>
                {category.isDefault && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-600">predeterminada</span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(category)}
                  className="text-slate-500 transition-colors duration-200 hover:text-slate-200"
                  aria-label="Renombrar categoría"
                >
                  <Pencil size={14} />
                </button>
                {!category.isDefault && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: category.id })}
                    className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                    aria-label="Eliminar categoría"
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

CategoryManagerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}
