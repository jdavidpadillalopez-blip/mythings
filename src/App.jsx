import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Wallet2 } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import NavTabs from './components/NavTabs'
import TrmWidget from './components/TrmWidget'
import TrmHistoryChart from './components/TrmHistoryChart'
import IncomeForm from './components/IncomeForm'
import DebtManager from './components/DebtManager'
import ExpenseForm from './components/ExpenseForm'
import Dashboard from './components/Dashboard'
import PocketManager from './components/PocketManager'
import RecurringRuleManager from './components/RecurringRuleManager'
import RecurringPaymentChecklist from './components/RecurringPaymentChecklist'
import FixedExpenseChecklist from './components/FixedExpenseChecklist'
import Reports from './components/Reports'
import DataManagement from './components/DataManagement'
import FloatingCalculator from './components/FloatingCalculator'
import ErrorBoundary from './components/ErrorBoundary'
import SyncErrorBanner from './components/SyncErrorBanner'

const sectionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

function TabSection({ tabKey, children }) {
  return (
    <motion.div
      key={tabKey}
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      <ErrorBoundary key={tabKey}>{children}</ErrorBoundary>
    </motion.div>
  )
}

function AppContent() {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white print:text-black">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
            <Wallet2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50">Finanzas USD → COP</h1>
            <p className="text-xs text-slate-500">Ingresos en dólares, gastos en pesos colombianos</p>
          </div>
        </div>
      </header>

      <SyncErrorBanner />
      <NavTabs active={activeTab} onChange={setActiveTab} />

      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <TabSection tabKey="dashboard">
              <div className="flex flex-col gap-4">
                <TrmWidget />
                <Dashboard />
              </div>
            </TabSection>
          )}

          {activeTab === 'ingresos' && (
            <TabSection tabKey="ingresos">
              <IncomeForm />
            </TabSection>
          )}

          {activeTab === 'gastos' && (
            <TabSection tabKey="gastos">
              <div className="flex flex-col gap-4">
                <ErrorBoundary>
                  <FixedExpenseChecklist />
                </ErrorBoundary>
                <ExpenseForm />
              </div>
            </TabSection>
          )}

          {activeTab === 'deudas' && (
            <TabSection tabKey="deudas">
              <DebtManager />
            </TabSection>
          )}

          {activeTab === 'bolsillos' && (
            <TabSection tabKey="bolsillos">
              <PocketManager />
            </TabSection>
          )}

          {activeTab === 'recurrentes' && (
            <TabSection tabKey="recurrentes">
              <div className="flex flex-col gap-4">
                <ErrorBoundary>
                  <RecurringPaymentChecklist />
                </ErrorBoundary>
                <RecurringRuleManager />
              </div>
            </TabSection>
          )}

          {activeTab === 'reportes' && (
            <TabSection tabKey="reportes">
              <Reports />
            </TabSection>
          )}

          {activeTab === 'trm' && (
            <TabSection tabKey="trm">
              <TrmHistoryChart trm={state.trm} />
            </TabSection>
          )}

          {activeTab === 'datos' && (
            <TabSection tabKey="datos">
              <DataManagement />
            </TabSection>
          )}
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-600 print:hidden">
        Todos los datos se guardan localmente en tu navegador.
      </footer>

      <FloatingCalculator />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
