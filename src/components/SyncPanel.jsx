import { Cloud, CloudOff, Loader2, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/format'

const STATUS_META = {
  idle: { icon: CheckCircle2, label: 'Al día', className: 'text-emerald-400' },
  connecting: { icon: Loader2, label: 'Conectando…', className: 'text-cyan-400 animate-pulse' },
  syncing: { icon: Loader2, label: 'Sincronizando…', className: 'text-cyan-400' },
  error: { icon: AlertCircle, label: 'Error de sincronización', className: 'text-red-400' },
}

export default function SyncPanel() {
  const { sync, connectOneDrive, disconnectOneDrive } = useApp()
  const meta = STATUS_META[sync.status] ?? STATUS_META.idle
  const StatusIcon = meta.icon

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
        <Cloud size={16} />
        Sincronización entre dispositivos
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Conecta tu cuenta de OneDrive una sola vez: desde ese momento tus datos se suben y bajan
        automáticamente entre tu laptop y tu celular, sin botones que apretar. Se guardan en una
        carpeta privada que la app crea solo para sí misma dentro de tu OneDrive.
      </p>

      {!sync.connected ? (
        <button
          type="button"
          onClick={connectOneDrive}
          disabled={sync.status === 'connecting'}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sync.status === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
          Conectar con OneDrive
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <StatusIcon size={16} className={`${meta.className} ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{meta.label}</span>
            </div>
            <button
              type="button"
              onClick={disconnectOneDrive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors duration-200 hover:border-red-500 hover:text-red-400"
            >
              <LogOut size={14} />
              Desconectar
            </button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {sync.profile && (
              <span>
                Conectado como {sync.profile.mail || sync.profile.userPrincipalName || sync.profile.displayName}
              </span>
            )}
            <span>Última sincronización: {sync.lastSyncedAt ? formatDate(sync.lastSyncedAt) : 'nunca'}</span>
          </div>

          {sync.error && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <CloudOff size={14} />
              {sync.error}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
        <p className="mb-1 font-medium text-slate-400">Cómo funciona:</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Presiona "Conectar con OneDrive" e inicia sesión con tu cuenta de Microsoft.</li>
          <li>Haz lo mismo en tu otro dispositivo (laptop o celular), con la misma cuenta.</li>
          <li>
            Desde ahí, cada cambio que hagas se guarda solo unos segundos después, y cada vez que
            abres la app trae automáticamente lo último guardado — no hay que subir ni descargar
            nada a mano.
          </li>
        </ol>
        <p className="mt-2">
          Solo se guarda un archivo de respaldo en una carpeta privada de la app dentro de tu
          OneDrive — no accede a ningún otro archivo tuyo. Los comprobantes (fotos/PDFs) no viajan
          en la sincronización, igual que en el respaldo local.
        </p>
      </div>
    </div>
  )
}
