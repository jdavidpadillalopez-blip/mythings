import PropTypes from 'prop-types'
import { useApp } from '../context/AppContext'
import TagManagerModal from './TagManagerModal'

export default function PaymentMethodManagerModal({ open, onClose }) {
  const { state } = useApp()
  return (
    <TagManagerModal
      open={open}
      onClose={onClose}
      title="Gestionar medios de pago"
      items={state.paymentMethods}
      placeholder="Nuevo medio (ej: Nequi)"
      addAction="ADD_PAYMENT_METHOD"
      renameAction="RENAME_PAYMENT_METHOD"
      deleteAction="DELETE_PAYMENT_METHOD"
    />
  )
}

PaymentMethodManagerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}
