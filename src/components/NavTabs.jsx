import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'deudas', label: 'Deudas' },
  { id: 'bolsillos', label: 'Bolsillos' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'trm', label: 'Histórico TRM' },
  { id: 'datos', label: 'Datos' },
]

export default function NavTabs({ active, onChange }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

NavTabs.propTypes = {
  active: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}
