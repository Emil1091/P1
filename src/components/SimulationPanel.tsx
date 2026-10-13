import React, { useState } from 'react';
import { Activity, RefreshCw, ChevronDown, ChevronUp, Wifi, WifiOff, AlertTriangle, XCircle } from 'lucide-react';
import type { SimulationData, SimulatedClient, BoxSignalStatus } from '../types/ftth';
import { STATUS_COLORS, SIGNAL_THRESHOLDS, averageSignal, calculateBoxStatus } from '../utils/simulation';

interface SimulationPanelProps {
  isActive: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  simData: SimulationData;
  /** Nombre de la caja seleccionada, para mostrar detalle */
  selectedBoxId: string | null;
  selectedBoxName?: string;
  // Pintado manual
  paintMode?: BoxSignalStatus | null;
  onPaintModeChange?: (mode: BoxSignalStatus | null) => void;
}

const StatusIcon: React.FC<{ status: BoxSignalStatus }> = ({ status }) => {
  switch (status) {
    case 'warning':  return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    case 'critical': return <AlertTriangle className="w-3 h-3 text-orange-400" />;
    case 'offline':  return <XCircle       className="w-3 h-3 text-red-400"    />;
    default:         return <Wifi          className="w-3 h-3 text-emerald-400" />;
  }
};

const ClientRow: React.FC<{ client: SimulatedClient }> = ({ client }) => {
  const color = !client.isOnline
    ? 'text-red-400'
    : client.signal <= SIGNAL_THRESHOLDS.CRITICAL
    ? 'text-orange-400'
    : client.signal <= SIGNAL_THRESHOLDS.WARNING
    ? 'text-yellow-400'
    : 'text-emerald-400';

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 transition">
      <div className="flex items-center gap-1.5">
        {client.isOnline
          ? <Wifi    className={`w-3 h-3 ${color}`} />
          : <WifiOff className="w-3 h-3 text-red-400" />
        }
        <span className="text-[11px] text-slate-300 font-mono">{client.name}</span>
      </div>
      <span className={`text-[11px] font-bold font-mono ${color}`}>
        {client.isOnline ? `${client.signal} dBm` : 'Offline'}
      </span>
    </div>
  );
};

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  isActive,
  onToggle,
  onRegenerate,
  simData,
  selectedBoxId,
  selectedBoxName,
  paintMode,
  onPaintModeChange,
}) => {
  const [showDetail, setShowDetail] = useState(false);

  const selectedClients: SimulatedClient[] = selectedBoxId ? (simData[selectedBoxId] ?? []) : [];
  const selectedStatus = calculateBoxStatus(selectedClients);
  const avgSig = averageSignal(selectedClients);
  const onlineCount  = selectedClients.filter(c => c.isOnline).length;
  const offlineCount = selectedClients.filter(c => !c.isOnline).length;

  // Resumen global: contar NAPs por estado
  const allStatuses = Object.entries(simData).map(([, clients]) => calculateBoxStatus(clients));
  const summary = {
    normal:   allStatuses.filter(s => s === 'normal').length,
    warning:  allStatuses.filter(s => s === 'warning').length,
    critical: allStatuses.filter(s => s === 'critical').length,
    offline:  allStatuses.filter(s => s === 'offline').length,
  };

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300 ${
      isActive
        ? 'bg-indigo-950/40 border-indigo-500/40'
        : 'bg-slate-900/60 border-slate-800/60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200">Simulación de Señal</span>
          {isActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] text-indigo-300 font-semibold">ACTIVA</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <button
              onClick={onRegenerate}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Regenerar datos de simulación"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onToggle}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
              isActive
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isActive ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>

      {/* Contenido activo */}
      {isActive && (
        <>
{/* Pincel de evento por clic */}
          <div className="flex items-center gap-1.5 flex-wrap px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-[10px] text-slate-500">Pincel:</span>
            {([
              { label: 'Normal', mode: 'normal' as BoxSignalStatus, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' },
              { label: 'Degradada', mode: 'warning' as BoxSignalStatus, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30' },
              { label: 'Crítica', mode: 'critical' as BoxSignalStatus, color: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30' },
              { label: 'Sin señal', mode: 'offline' as BoxSignalStatus, color: 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30' },
            ]).map(({ label, mode, color }) => (
              <button
                key={mode}
                onClick={() => onPaintModeChange?.(paintMode === mode ? null : mode)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition ${
                  paintMode === mode ? color + ' ring-1 ring-white/20' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={`Marcar cajas como ${label}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => onPaintModeChange?.(null)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition ${
                paintMode === null
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Desactivar pincel (sin pintar)"
            >
              Apagar
            </button>
          </div>
          {paintMode && (
            <p className="text-[10px] text-slate-400 px-1">
              Pincel activo: haz clic sobre una caja para marcarla como {STATUS_COLORS[paintMode].label.toLowerCase()}.
            </p>
          )}

          {/* Leyenda de estados */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {(Object.entries(STATUS_COLORS) as [BoxSignalStatus, typeof STATUS_COLORS[BoxSignalStatus]][]).map(([status, cfg]) => (
              <div key={status} className={`flex items-center justify-between px-2 py-1 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-[10px] text-slate-400">{cfg.label}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-200 ml-1">
                  {summary[status]}
                </span>
              </div>
            ))}
          </div>

          {/* Umbral de referencia */}
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-[10px] text-slate-500">Umbrales:</span>
            <span className="text-[10px] font-mono text-yellow-400">≤{SIGNAL_THRESHOLDS.WARNING} dBm → amarillo</span>
            <span className="text-[10px] font-mono text-orange-400">≤{SIGNAL_THRESHOLDS.CRITICAL} dBm → naranja</span>
            <span className="text-[10px] font-mono text-red-400">todos offline → rojo</span>
          </div>

          {/* Detalle de la caja seleccionada */}
          {selectedBoxId && selectedClients.length > 0 && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 overflow-hidden">
              <button
                onClick={() => setShowDetail(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon status={selectedStatus} />
                  <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[200px]">
                    {selectedBoxName ?? selectedBoxId}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[selectedStatus].badge}`}>
                    {STATUS_COLORS[selectedStatus].label}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {avgSig !== null && (
                    <span className="text-[10px] font-mono text-slate-400">
                      prom. <span className="text-slate-200">{avgSig} dBm</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {onlineCount}↑ {offlineCount > 0 && <span className="text-red-400">{offlineCount}↓</span>}
                  </span>
                  {showDetail
                    ? <ChevronUp   className="w-3.5 h-3.5 text-slate-500" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  }
                </div>
              </button>

              {showDetail && (
                <div className="px-3 pb-3 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {selectedClients.map(client => (
                    <ClientRow key={client.id} client={client} />
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedBoxId && selectedClients.length === 0 && (
            <p className="text-[10px] text-slate-600 px-1">
              Seleccioná una caja NAP para ver el detalle de clientes.
            </p>
          )}
        </>
      )}
    </div>
  );
};
