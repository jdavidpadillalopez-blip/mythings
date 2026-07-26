import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { X } from 'lucide-react'

/** Shared modal shell: backdrop, Escape-to-close, fade+scale entrance. Used by every dialog in the app. */
export default function Modal({ open, onClose, title, children, widthClassName }) {
  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[85vh] w-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl ${widthClassName ?? 'max-w-lg'}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 transition-colors duration-200 hover:text-slate-200"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  widthClassName: PropTypes.string,
}
