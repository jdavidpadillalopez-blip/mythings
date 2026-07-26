// General-purpose tagging taxonomy used by variable expenses, income entries, and recurring rules.
// This is separate from the fixedExpenses slice (Arriendo/Alimentación/Transporte/Seguridad social),
// which models fixed monthly bills with one editable amount each, not a category you tag transactions
// with — the two features look similar but serve different purposes, so they stay independent.
export const DEFAULT_CATEGORIES = [
  { id: 'cat-arriendo', nombre: 'Arriendo', isDefault: true },
  { id: 'cat-alimentacion', nombre: 'Alimentación', isDefault: true },
  { id: 'cat-transporte', nombre: 'Transporte', isDefault: true },
  { id: 'cat-seguridad-social', nombre: 'Seguridad social', isDefault: true },
  { id: 'cat-entretenimiento', nombre: 'Entretenimiento', isDefault: true },
  { id: 'cat-salud', nombre: 'Salud', isDefault: true },
  { id: 'cat-salario', nombre: 'Salario', isDefault: true },
  { id: 'cat-otros', nombre: 'Otros', isDefault: true },
]
