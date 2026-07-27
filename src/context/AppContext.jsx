import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { upsertTrmHistoryEntry } from '../utils/trmHistory'
import {
  getMonthKey,
  loadDebtsWithMigration,
  saveDebts,
  toggleInstallment,
  deriveInstallmentStatuses,
  computeEstadoGeneral,
} from '../utils/debts'
import { generarTransaccionesDesdeRegla } from '../utils/recurring'
import { DEFAULT_CATEGORIES } from '../utils/categories'
import { DEFAULT_INCOME_SOURCES, DEFAULT_PAYMENT_METHODS } from '../utils/sources'
import { startLogin, handleRedirectCallback, isLoggedIn, logout as msLogout } from '../utils/msAuth'
import { readBackup, writeBackup, fetchProfile } from '../utils/oneDriveSync'
import { buildExportPayload } from '../utils/exportPayload'

const STORAGE_KEY = 'finanzas-usd-cop-state'
const LAST_SYNC_KEY = 'finanzas-onedrive-last-sync'
// How long to wait after the last edit before pushing to OneDrive — avoids firing a network request
// on every keystroke while the user is mid-edit on a form.
const PUSH_DEBOUNCE_MS = 2500

const DEFAULT_FIXED_EXPENSES = [
  { id: 'fixed-arriendo', name: 'Arriendo', amount: 0, isDefault: true },
  { id: 'fixed-alimentacion', name: 'Alimentación', amount: 0, isDefault: true },
  { id: 'fixed-transporte', name: 'Transporte', amount: 0, isDefault: true },
  { id: 'fixed-seguridad-social', name: 'Seguridad social', amount: 0, isDefault: true },
]

// Adds any default fixed-expense categories a saved state predates (e.g. Seguridad social was
// introduced after some users already had Arriendo/Alimentación/Transporte saved) without touching
// amounts the user already entered or any custom categories they added.
function withMissingDefaults(fixedExpenses) {
  const existingIds = new Set(fixedExpenses.map((expense) => expense.id))
  const missing = DEFAULT_FIXED_EXPENSES.filter((expense) => !existingIds.has(expense.id))
  return missing.length > 0 ? [...fixedExpenses, ...missing] : fixedExpenses
}

// Shared by categories, incomeSources, and paymentMethods: all three are "flat list of named tags
// with some non-removable defaults" slices, so a saved state predating a given default tag (or a
// freshly bootstrapped app) gets it appended without touching anything the user already has.
function withMissingTaggedItems(items, defaults) {
  const existingIds = new Set(items.map((item) => item.id))
  const missing = defaults.filter((item) => !existingIds.has(item.id))
  return missing.length > 0 ? [...items, ...missing] : items
}

const initialState = {
  trm: {
    rate: 4000,
    lastUpdated: null,
    source: 'manual',
  },
  incomes: [],
  debts: [],
  fixedExpenses: DEFAULT_FIXED_EXPENSES,
  variableExpenses: [],
  pockets: [],
  recurringRules: [],
  recurringTransactions: [],
  categories: DEFAULT_CATEGORIES,
  incomeSources: DEFAULT_INCOME_SOURCES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  // Permanent, append-only records — never touched by deleting or unmarking a debt/cuota, so
  // there's always a paper trail available for a claim/dispute or just to see what's been paid off.
  paymentHistory: [],
  archivedDebts: [],
  // Internal movements of money already counted as income (e.g. withdrawing part of a Deel balance
  // as physical cash). Deliberately NOT re-added to totalIncome anywhere — the money was already
  // counted once when the original income was registered; this just tracks where it physically
  // ended up and at what real (possibly non-TRM) rate, for the user's own bookkeeping.
  sourceTransfers: [],
}

// A minimal shape check so a malformed/foreign JSON file can't silently corrupt the app on import —
// every array-shaped slice just needs to actually be an array; anything missing falls back to empty.
function isValidImportedState(candidate) {
  if (!candidate || typeof candidate !== 'object') return false
  const arrayKeys = [
    'incomes',
    'debts',
    'fixedExpenses',
    'variableExpenses',
    'pockets',
    'recurringRules',
    'recurringTransactions',
    'categories',
    'incomeSources',
    'paymentMethods',
    'paymentHistory',
    'archivedDebts',
    'sourceTransfers',
  ]
  return arrayKeys.every((key) => key in candidate === false || Array.isArray(candidate[key]))
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      ...initialState,
      ...parsed,
      trm: { ...initialState.trm, ...parsed.trm },
      fixedExpenses: parsed.fixedExpenses?.length
        ? withMissingDefaults(parsed.fixedExpenses)
        : DEFAULT_FIXED_EXPENSES,
      categories: parsed.categories?.length
        ? withMissingTaggedItems(parsed.categories, DEFAULT_CATEGORIES)
        : DEFAULT_CATEGORIES,
      incomeSources: parsed.incomeSources?.length
        ? withMissingTaggedItems(parsed.incomeSources, DEFAULT_INCOME_SOURCES)
        : DEFAULT_INCOME_SOURCES,
      paymentMethods: parsed.paymentMethods?.length
        ? withMissingTaggedItems(parsed.paymentMethods, DEFAULT_PAYMENT_METHODS)
        : DEFAULT_PAYMENT_METHODS,
      pockets: parsed.pockets ?? [],
      recurringRules: parsed.recurringRules ?? [],
      recurringTransactions: parsed.recurringTransactions ?? [],
      paymentHistory: parsed.paymentHistory ?? [],
      archivedDebts: parsed.archivedDebts ?? [],
      sourceTransfers: parsed.sourceTransfers ?? [],
      // debts live in their own localStorage slice (debts_v2); this also migrates the old
      // flat { name, totalBalance, monthlyPayment } shape the first time it's found.
      debts: loadDebtsWithMigration(parsed.debts),
    }
  } catch {
    return initialState
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRM':
      return {
        ...state,
        trm: {
          rate: Number(action.payload.rate),
          lastUpdated: action.payload.lastUpdated ?? new Date().toISOString(),
          source: action.payload.source ?? 'manual',
        },
      }

    case 'ADD_INCOME':
      return { ...state, incomes: [action.payload, ...state.incomes] }

    case 'DELETE_INCOME':
      return { ...state, incomes: state.incomes.filter((item) => item.id !== action.payload) }

    case 'ADD_DEBT':
      return { ...state, debts: [action.payload, ...state.debts] }

    case 'UPDATE_DEBT':
      return {
        ...state,
        debts: state.debts.map((debt) =>
          debt.id === action.payload.id ? { ...debt, ...action.payload.changes } : debt,
        ),
      }

    case 'DELETE_DEBT':
      return { ...state, debts: state.debts.filter((debt) => debt.id !== action.payload) }

    case 'TOGGLE_DEBT_INSTALLMENT': {
      const currentMonthKey = getMonthKey(new Date())
      const targetDebt = state.debts.find((debt) => debt.id === action.payload.debtId)
      const cuotaBefore = targetDebt?.cuotas.find((cuota) => cuota.numero === action.payload.numero)
      // A comprobante in the payload only ever accompanies a pendiente/atrasada → pagada transition
      // (see DebtInstallmentTracker.jsx) — that's the "achievement" this logs. Un-marking (no
      // comprobante passed) never removes the entry already logged for a prior payment.
      const isMarkingPaid = Boolean(action.payload.comprobante) && cuotaBefore?.estado !== 'pagada'

      const nextDebts = state.debts.map((debt) =>
        debt.id === action.payload.debtId
          ? toggleInstallment(debt, action.payload.numero, currentMonthKey, action.payload.comprobante ?? null)
          : debt,
      )

      if (!isMarkingPaid || !targetDebt || !cuotaBefore) {
        return { ...state, debts: nextDebts }
      }

      const historyEntry = {
        id: crypto.randomUUID(),
        debtId: targetDebt.id,
        debtNombre: targetDebt.nombre,
        numero: cuotaBefore.numero,
        cuotasTotal: targetDebt.numeroCuotasTotal,
        mes: cuotaBefore.mes,
        montoEsperado: cuotaBefore.montoEsperado,
        fechaPago: new Date().toISOString(),
        comprobante: action.payload.comprobante,
      }

      return { ...state, debts: nextDebts, paymentHistory: [historyEntry, ...state.paymentHistory] }
    }

    case 'ACK_DEBT_MIGRATION':
      return {
        ...state,
        debts: state.debts.map(({ migratedFromLegacy, ...debt }) => debt),
      }

    // ---- archive (soft-delete): a debt removed from the active list keeps its full cuota history
    // (including comprobante metadata) in archivedDebts indefinitely — nothing is purged. Restoring
    // brings it back and re-derives atrasada/estadoGeneral against "now", since time may have passed.
    case 'ARCHIVE_DEBT': {
      const debt = state.debts.find((d) => d.id === action.payload)
      if (!debt) return state
      return {
        ...state,
        debts: state.debts.filter((d) => d.id !== action.payload),
        archivedDebts: [{ ...debt, fechaArchivado: new Date().toISOString() }, ...state.archivedDebts],
      }
    }

    case 'RESTORE_DEBT': {
      const archived = state.archivedDebts.find((d) => d.id === action.payload)
      if (!archived) return state
      const { fechaArchivado, ...debt } = archived
      const cuotas = deriveInstallmentStatuses(debt.cuotas, getMonthKey(new Date()))
      return {
        ...state,
        archivedDebts: state.archivedDebts.filter((d) => d.id !== action.payload),
        debts: [{ ...debt, cuotas, estadoGeneral: computeEstadoGeneral(cuotas) }, ...state.debts],
      }
    }

    // The one truly destructive debt action left — only reachable from the archived-debts section,
    // behind its own confirmation. paymentHistory is untouched even here: the achievement log is
    // never tied to whether the debt object itself still exists.
    case 'PURGE_ARCHIVED_DEBT':
      return { ...state, archivedDebts: state.archivedDebts.filter((d) => d.id !== action.payload) }

    case 'ADD_FIXED_EXPENSE':
      return { ...state, fixedExpenses: [...state.fixedExpenses, action.payload] }

    case 'UPDATE_FIXED_EXPENSE':
      return {
        ...state,
        fixedExpenses: state.fixedExpenses.map((expense) =>
          expense.id === action.payload.id ? { ...expense, ...action.payload.changes } : expense,
        ),
      }

    case 'DELETE_FIXED_EXPENSE':
      return {
        ...state,
        fixedExpenses: state.fixedExpenses.filter((expense) => expense.id !== action.payload),
      }

    case 'ADD_VARIABLE_EXPENSE':
      return { ...state, variableExpenses: [action.payload, ...state.variableExpenses] }

    case 'DELETE_VARIABLE_EXPENSE':
      return {
        ...state,
        variableExpenses: state.variableExpenses.filter((item) => item.id !== action.payload),
      }

    // ---- pockets ----
    case 'ADD_POCKET':
      return { ...state, pockets: [action.payload, ...state.pockets] }

    case 'UPDATE_POCKET':
      return {
        ...state,
        pockets: state.pockets.map((pocket) =>
          pocket.id === action.payload.id ? { ...pocket, ...action.payload.changes } : pocket,
        ),
      }

    case 'DELETE_POCKET':
      return { ...state, pockets: state.pockets.filter((pocket) => pocket.id !== action.payload) }

    case 'ADD_POCKET_CONTRIBUTION':
      return {
        ...state,
        pockets: state.pockets.map((pocket) =>
          pocket.id === action.payload.pocketId
            ? {
                ...pocket,
                valorActual: pocket.valorActual + action.payload.contribution.monto,
                historialAportes: [action.payload.contribution, ...pocket.historialAportes],
              }
            : pocket,
        ),
      }

    // ---- recurring rules ----
    case 'ADD_RECURRING_RULE':
      return { ...state, recurringRules: [action.payload, ...state.recurringRules] }

    case 'UPDATE_RECURRING_RULE':
      return {
        ...state,
        recurringRules: state.recurringRules.map((rule) =>
          rule.id === action.payload.id ? { ...rule, ...action.payload.changes } : rule,
        ),
      }

    case 'DELETE_RECURRING_RULE':
      return {
        ...state,
        recurringRules: state.recurringRules.filter((rule) => rule.id !== action.payload),
        recurringTransactions: state.recurringTransactions.filter(
          (tx) => tx.origenReglaId !== action.payload,
        ),
      }

    case 'APPEND_RECURRING_TRANSACTIONS':
      return { ...state, recurringTransactions: [...state.recurringTransactions, ...action.payload] }

    // ---- categories ----
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }

    case 'RENAME_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.payload.id ? { ...category, nombre: action.payload.nombre } : category,
        ),
      }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(
          (category) => category.id !== action.payload || category.isDefault,
        ),
      }

    // ---- income sources ----
    case 'ADD_INCOME_SOURCE':
      return { ...state, incomeSources: [...state.incomeSources, action.payload] }

    case 'RENAME_INCOME_SOURCE':
      return {
        ...state,
        incomeSources: state.incomeSources.map((source) =>
          source.id === action.payload.id ? { ...source, nombre: action.payload.nombre } : source,
        ),
      }

    case 'DELETE_INCOME_SOURCE':
      return {
        ...state,
        incomeSources: state.incomeSources.filter(
          (source) => source.id !== action.payload || source.isDefault,
        ),
      }

    // ---- payment methods ----
    case 'ADD_PAYMENT_METHOD':
      return { ...state, paymentMethods: [...state.paymentMethods, action.payload] }

    case 'RENAME_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.map((method) =>
          method.id === action.payload.id ? { ...method, nombre: action.payload.nombre } : method,
        ),
      }

    case 'DELETE_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter(
          (method) => method.id !== action.payload || method.isDefault,
        ),
      }

    // ---- source transfers (e.g. Deel USD → Efectivo COP) ----
    case 'ADD_SOURCE_TRANSFER':
      return { ...state, sourceTransfers: [action.payload, ...state.sourceTransfers] }

    case 'DELETE_SOURCE_TRANSFER':
      return {
        ...state,
        sourceTransfers: state.sourceTransfers.filter((transfer) => transfer.id !== action.payload),
      }

    // ---- backup / restore ----
    case 'IMPORT_STATE':
      return { ...initialState, ...action.payload }

    case 'RESET_ALL':
      return initialState

    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  // ---- OneDrive sync (automatic, no manual push/pull) ----
  // `connected` mirrors whether a refresh token exists (msAuth's own source of truth); everything
  // else here is just UI-facing status for SyncPanel.jsx.
  const [sync, setSync] = useState(() => ({
    connected: isLoggedIn(),
    status: 'idle', // 'idle' | 'connecting' | 'syncing' | 'error'
    lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
    profile: null,
    error: null,
  }))
  // Guards against the pull-triggered IMPORT_STATE immediately re-triggering a push of the exact
  // data that was just pulled — wasteful (and, in a very unlucky race, could stomp a concurrent
  // edit from another device) but otherwise harmless since it'd just write back identical content.
  const skipNextPushRef = useRef(false)
  const pushTimerRef = useRef(null)

  const connectOneDrive = useCallback(() => {
    setSync((s) => ({ ...s, status: 'connecting', error: null }))
    // Full-page redirect to Microsoft's login — the app reloads and handleRedirectCallback (below)
    // picks up the result, so nothing else happens here synchronously.
    startLogin().catch((err) => setSync((s) => ({ ...s, status: 'error', error: err.message })))
  }, [])

  const disconnectOneDrive = useCallback(() => {
    msLogout()
    localStorage.removeItem(LAST_SYNC_KEY)
    setSync({ connected: false, status: 'idle', lastSyncedAt: null, profile: null, error: null })
  }, [])

  // On first mount: finish any pending login redirect, then — if connected — pull the latest
  // backup from OneDrive once. This is what makes a second device (e.g. the phone) see existing
  // data the moment it opens the app, instead of relying on a manual "download" button.
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        // Completes the token exchange if we just got redirected back from Microsoft's login page;
        // a no-op otherwise. Either way, isLoggedIn() below reflects the up-to-date state.
        await handleRedirectCallback()
      } catch (err) {
        if (!cancelled) setSync((s) => ({ ...s, status: 'error', error: err.message }))
      }
      if (cancelled) return
      if (!isLoggedIn()) return

      setSync((s) => ({ ...s, connected: true, status: 'syncing', error: null }))
      try {
        const [profile, backup] = await Promise.all([fetchProfile().catch(() => null), readBackup()])
        if (cancelled) return
        if (backup) {
          skipNextPushRef.current = true
          dispatch({ type: 'IMPORT_STATE', payload: backup })
        }
        const now = new Date().toISOString()
        localStorage.setItem(LAST_SYNC_KEY, now)
        setSync((s) => ({ ...s, status: 'idle', profile, lastSyncedAt: now, error: null }))
      } catch (err) {
        if (!cancelled) setSync((s) => ({ ...s, status: 'error', error: err.message }))
      }
    }
    init()
    return () => {
      cancelled = true
    }
    // Intentionally run once on mount only — reconnecting mid-session goes through connectOneDrive,
    // which triggers a full page redirect/reload anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced auto-push: any state change while connected schedules a push a couple seconds later,
  // coalescing rapid-fire edits into a single request. No button, no user action required.
  useEffect(() => {
    if (!sync.connected) return undefined
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      return undefined
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(async () => {
      try {
        setSync((s) => ({ ...s, status: 'syncing' }))
        await writeBackup(buildExportPayload(state))
        const now = new Date().toISOString()
        localStorage.setItem(LAST_SYNC_KEY, now)
        setSync((s) => ({ ...s, status: 'idle', lastSyncedAt: now, error: null }))
      } catch (err) {
        setSync((s) => ({ ...s, status: 'error', error: err.message }))
      }
    }, PUSH_DEBOUNCE_MS)
    return () => clearTimeout(pushTimerRef.current)
  }, [state, sync.connected])

  useEffect(() => {
    // debts persist separately (see below) — omit them here so there's a single source of truth.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, debts: undefined }))
  }, [state])

  useEffect(() => {
    saveDebts(state.debts)
  }, [state.debts])

  // Every TRM update (automatic or manual) also lands as a dated point in trm_history,
  // which is what powers the "Histórico TRM" chart — one entry per calendar day.
  useEffect(() => {
    if (!state.trm.lastUpdated) return
    upsertTrmHistoryEntry({
      rate: state.trm.rate,
      source: state.trm.source,
      timestamp: state.trm.lastUpdated,
    })
  }, [state.trm.rate, state.trm.lastUpdated, state.trm.source])

  // On load (and whenever a rule is added/edited), project each active recurring rule forward to
  // today and append any occurrence not already recorded. Deterministic per-occurrence ids
  // (ruleId-fecha) make this naturally idempotent, so re-running it never duplicates a transaction.
  useEffect(() => {
    const today = new Date()
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const existingIds = new Set(state.recurringTransactions.map((tx) => tx.id))
    const newOnes = state.recurringRules
      .filter((rule) => !rule.pausada)
      .flatMap((rule) => generarTransaccionesDesdeRegla(rule, todayISO))
      .filter((tx) => !existingIds.has(tx.id))

    if (newOnes.length > 0) {
      dispatch({ type: 'APPEND_RECURRING_TRANSACTIONS', payload: newOnes })
    }
    // Intentionally scoped to recurringRules only: this dispatch changes recurringTransactions,
    // not recurringRules, so including it here would just be redundant re-checking, not a bug.
  }, [state.recurringRules])

  const value = useMemo(
    () => ({ state, dispatch, sync, connectOneDrive, disconnectOneDrive }),
    [state, sync, connectOneDrive, disconnectOneDrive],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

export { initialState, isValidImportedState, STORAGE_KEY }
