// Where income lands (income) and how an expense was actually paid (expenses). Kept as separate
// taxonomies from `categories` (utils/categories.js) because "Deel" isn't a spending category and
// "Efectivo" isn't a category either — these describe the account/rail money moved through, which
// is what MoneyFlowSankey.jsx visualizes.
export const DEFAULT_INCOME_SOURCES = [
  { id: 'src-deel', nombre: 'Deel', isDefault: true },
  { id: 'src-transferencia', nombre: 'Tarjeta NU', isDefault: true },
  { id: 'src-otro', nombre: 'Otro', isDefault: true },
]

export const DEFAULT_PAYMENT_METHODS = [
  { id: 'pm-efectivo', nombre: 'Efectivo', isDefault: true },
  { id: 'pm-pse', nombre: 'PSE', isDefault: true },
  { id: 'pm-tarjeta-debito', nombre: 'Tarjeta débito', isDefault: true },
  { id: 'pm-tarjeta-credito', nombre: 'Tarjeta crédito', isDefault: true },
  { id: 'pm-transferencia', nombre: 'Transferencia', isDefault: true },
]
