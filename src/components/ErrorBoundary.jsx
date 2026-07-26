import { Component } from 'react'
import PropTypes from 'prop-types'
import { AlertTriangle } from 'lucide-react'

/**
 * Last line of defense against a render crash in any single section (a chart choking on unusual
 * data, etc.). Without this, an uncaught error unmounts the entire React tree and leaves a blank
 * page with no way back in — which is what happened when MoneyFlowSankey hit a cyclic graph.
 * Catches the error, shows a recoverable message instead, and reassures the user their data (in
 * localStorage/IndexedDB) is untouched. App.jsx keys this by the active tab, so switching tabs
 * remounts a fresh instance and clears the error automatically.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error de render:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-6 text-sm text-red-300">
          <p className="mb-1 flex items-center gap-2 font-semibold text-red-400">
            <AlertTriangle size={16} />
            Algo salió mal mostrando esta sección
          </p>
          <p className="text-red-300/80">
            {this.state.error?.message || 'Error desconocido'}. Tus datos siguen guardados en este
            navegador — no se perdió nada. Prueba cambiar de pestaña o recargar la página.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
}
