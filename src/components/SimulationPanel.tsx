import React, { useState } from 'react';
import { Activity, RefreshCw, ChevronDown, ChevronUp, Wifi, WifiOff, AlertTriangle, XCircle } from 'lucide-react';
import type { SimulationData, SimulatedClient, BoxSignalStatus, SimulationScenario, SimulationScope, FaultEvent } from '../types/ftth';
import { STATUS_COLORS, SIGNAL_THRESHOLDS, averageSignal, calculateBoxStatus, SIMULATION_SCENARIOS, SIMULATION_SCOPE_LABELS } from '../utils/simulation';

interface SimulationPanelProps {
  isActive: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  simData: SimulationData;
  /** Nombre de la caja seleccionada, para mostrar detalle */
  selectedBoxId: string | null;
  selectedBoxName?: string;
  /** Escenario de falla simulada elegido */
  scenario: SimulationScenario;
  /** Proporción de cajas afectadas (escenarios parciales) */
  scope: SimulationScope;
  /** Splitter secundario objetivo (escenario 'secundario_off') */
  targetSecondaryId: string | null;
  /** Opciones de secundarios instalados bajo el PON actual */
  secondaryOptions: { id: string; name: string }[];
  onScenarioChange: (scenario: SimulationScenario) => void;
  onScopeChange: (scope: SimulationScope) => void;
  onTargetSecondaryChange: (id: string) => void;
  /** Herramienta manual de falla: null = desactivada */
  faultTool: FaultEvent | null;
  onFaultToolChange: (tool: FaultEvent | null) => void;
}

const StatusIcon: React.FC<{ status: BoxSignalStatus }> = ({ status }) => {
  switch (status) {
    case 'warning':  return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    case 'critical': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
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
  scenario,
  scope,
  targetSecondaryId,
  secondaryOptions,
  onScenarioChange,
  onScopeChange,
  onTargetSecondaryChange,
  faultTool,
  onFaultToolChange,
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
          {/* Control de falla simulada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                Tipo de falla
              </label>
              <select
                value={scenario}
                onChange={(e) => onScenarioChange(e.target.value as SimulationScenario)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {(Object.entries(SIMULATION_SCENARIOS) as [SimulationScenario, { label: string }][]).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1 px-0.5">
                {SIMULATION_SCENARIOS[scenario].description}
              </p>
            </div>

            {(scenario === 'off_parcial' || scenario === 'atenuacion_parcial') && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Cajas afectadas
                </label>
                <select
                  value={scope}
                  onChange={(e) => onScopeChange(e.target.value as SimulationScope)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {(Object.entries(SIMULATION_SCOPE_LABELS) as [SimulationScope, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {scenario === 'secundario_off' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Splitter secundario afectado
                </label>
                <select
                  value={targetSecondaryId ?? ''}
                  onChange={(e) => onTargetSecondaryChange(e.target.value)}
                  disabled={secondaryOptions.length === 0}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:text-slate-500"
                >
                  {secondaryOptions.length === 0 ? (
                    <option value="">No hay secundarios instalados</option>
                  ) : (
                    secondaryOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Marcado manual con el mouse */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              O marcá cajas con el mouse
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFaultToolChange(faultTool === 'off' ? null : 'off')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition flex-1 justify-center ${
                  faultTool === 'off'
                    ? 'bg-red-500/25 border-red-500/60 text-red-200 ring-1 ring-red-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-red-300 hover:border-red-500/40'
                }`}
                title="Clic sobre una caja para dejarla sin señal"
              >
                <WifiOff className="w-3.5 h-3.5" /> Off
              </button>
              <button
                onClick={() => onFaultToolChange(faultTool === 'atenuacion' ? null : 'atenuacion')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition flex-1 justify-center ${
                  faultTool === 'atenuacion'
                    ? 'bg-amber-500/25 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40'
                }`}
                title="Clic sobre una caja para atenuarla"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Atenúar
              </button>
              <button
                onClick={() => onFaultToolChange(faultTool === 'normal' ? null : 'normal')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition flex-1 justify-center ${
                  faultTool === 'normal'
                    ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40'
                }`}
                title="Clic sobre una caja para restaurarla (señal normal)"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Normal
              </button>
            </div>
            <p className="text-[10px] text-slate-500 px-0.5">
              {faultTool
                ? `Modo activo: ${faultTool === 'off' ? 'apagar' : faultTool === 'atenuacion' ? 'atenuar' : 'restaurar'}. Clic sobre una caja del cuadro la deja así (afecta a toda su rama). Clic en el mismo botón para salir del modo.`
                : 'Elegí un evento y hacé clic sobre una caja del cuadro sinóptico para simularla.'}
            </p>
          </div>

          {/* Leyenda de estados */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[
              { cfg: STATUS_COLORS.normal,  count: summary.normal },
              { cfg: STATUS_COLORS.warning, count: summary.warning + summary.critical },
              { cfg: STATUS_COLORS.offline, count: summary.offline },
            ].map(({ cfg, count }) => (
              <div key={cfg.label} className={`flex items-center justify-between px-2 py-1 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-[10px] text-slate-400">{cfg.label}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-200 ml-1">
                  {count}
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
