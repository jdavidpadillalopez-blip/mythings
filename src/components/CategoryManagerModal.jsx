import PropTypes from 'prop-types'
import { useApp } from '../context/AppContext'
import TagManagerModal from './TagManagerModal'

export default function CategoryManagerModal({ open, onClose }) {
  const { state } = useApp()
  return (
    <TagManagerModal
      open={open}
      onClose={onClose}
      title="Gestionar categorías"
      items={state.categories}
      placeholder="Nueva categoría"
      addAction="ADD_CATEGORY"
      renameAction="RENAME_CATEGORY"
      deleteAction="DELETE_CATEGORY"
    />
  )
}

CategoryManagerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}
