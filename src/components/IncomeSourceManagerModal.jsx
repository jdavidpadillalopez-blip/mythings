import PropTypes from 'prop-types'
import { useApp } from '../context/AppContext'
import TagManagerModal from './TagManagerModal'

export default function IncomeSourceManagerModal({ open, onClose }) {
  const { state } = useApp()
  return (
    <TagManagerModal
      open={open}
      onClose={onClose}
      title="Gestionar fuentes de ingreso"
      items={state.incomeSources}
      placeholder="Nueva fuente (ej: Payoneer)"
      addAction="ADD_INCOME_SOURCE"
      renameAction="RENAME_INCOME_SOURCE"
      deleteAction="DELETE_INCOME_SOURCE"
    />
  )
}

IncomeSourceManagerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}
