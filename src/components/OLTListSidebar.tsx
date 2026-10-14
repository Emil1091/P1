import React, { useState } from 'react';
import {
  Server,
  Zap,
  ChevronRight,
  ChevronDown,
  Plus,
  Layers,
  Cpu,
  Trash2,
  Edit2,
  Activity,
  Search,
  X
} from 'lucide-react';
import type { OLTDevice, PONPort, BoxSignalStatus, SimulationData, FTTHNode } from '../types/ftth';
import { calculateBoxStatus } from '../utils/simulation';

interface OLTListSidebarProps {
  olts: OLTDevice[];
  selectedOltId: string | null;
  selectedPonId: string | null;
  expandedOltIds: string[];
  onToggleExpandOlt: (oltId: string) => void;
  onSelectPon: (oltId: string, ponId: string) => void;
  onOpenCreateOltModal: () => void;
  onOpenEditOltModal: (olt: OLTDevice) => void;
  onAddPonDirect: (oltId: string, slotIndex?: number) => void;
  onDeleteOlt: (oltId: string) => void;
  /** True si la simulación de señal está activa (para indicador en el desplegable) */
  isSimulationActive?: boolean;
  /** Mapa de PON id -> datos de simulación (ponSimData global), para marcar OLTs con fallas */
  ponSimData?: Record<string, SimulationData>;
  /** Contenido del panel de simulación a renderizar dentro del desplegable */
  simulationPanel?: React.ReactNode;
}

export const OLTListSidebar: React.FC<OLTListSidebarProps> = ({
  olts,
  selectedOltId,
  selectedPonId,
  expandedOltIds,
  onToggleExpandOlt,
  onSelectPon,
  onOpenCreateOltModal,
  onOpenEditOltModal,
  onAddPonDirect,
  onDeleteOlt,
  isSimulationActive,
  ponSimData,
  simulationPanel,
}) => {
  const [simOpen, setSimOpen] = useState(false);
  const [oltFilterQuery, setOltFilterQuery] = useState('');
  const filteredOlts = oltFilterQuery.trim()
    ? olts.filter(o => (o.name + ' ' + o.brand + ' ' + o.model).toLowerCase().includes(oltFilterQuery.trim().toLowerCase()))
    : olts;

  // Salta la alerta con una sola caja atenuada/off, no espera a que se caiga el secundario
  const ponHealth = (pon: PONPort): 'normal' | 'warning' | 'offline' => {
    if (!isSimulationActive || !ponSimData || !pon.primaryBox) return 'normal';
    const simData = ponSimData[pon.id];
    if (!simData) return 'normal';
    let off = false;
    let atten = false;
    const walk = (n: FTTHNode) => {
      if (n.type === 'caja_nap') {
        const s = calculateBoxStatus(simData[n.id] ?? []);
        if (s === 'offline') off = true;
        if (s === 'warning' || s === 'critical') atten = true;
      }
      (n.children ?? []).forEach(walk);
    };
    walk(pon.primaryBox);
    if (off) return 'offline';
    if (atten) return 'warning';
    return 'normal';
  };
  return (
    <aside className="w-80 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-20 shadow-2xl select-none flex-shrink-0">
      <style>{`
        @keyframes heartbeat { 0%{transform:scale(1);} 14%{transform:scale(1.35);} 28%{transform:scale(1);} 42%{transform:scale(1.35);} 70%{transform:scale(1);} }
        .heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 tracking-wider uppercase">
              Cabeceras OLT
            </h2>
            <p className="text-[10px] text-slate-500">{olts.length} equipos registrados</p>
            {isSimulationActive && ponSimData && (
              <p className="text-[9px] text-slate-400 mt-0.5">
                Ordenadas por señal:{' '}
                <span className="text-red-400 font-bold">off</span>
                {' → '}
                <span className="text-orange-400 font-bold">atenuadas</span>
                {' → '}
                <span className="text-slate-300">nombre</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onOpenCreateOltModal}
          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
          title="Agregar nueva OLT"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Nueva OLT</span>
        </button>
      </div>

      {/* Filtro / buscador de OLTs */}
      <div className="px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus-within:border-indigo-500 rounded-lg px-2.5 py-1 text-xs transition">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar OLT (nombre, marca, modelo)..."
            value={oltFilterQuery}
            onChange={(e) => setOltFilterQuery(e.target.value)}
            className="w-full bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-none text-xs"
          />
          {oltFilterQuery && (
            <button
              onClick={() => setOltFilterQuery('')}
              className="text-slate-500 hover:text-white"
              title="Limpiar filtro"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de OLTs con bandejas y PONs */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {(
          isSimulationActive && ponSimData
            ? [...filteredOlts].sort((a, b) => {
                const rankOf = (o: OLTDevice) => {
                  let bestRank = 0;
                  for (const p of o.ponPorts) {
                    const h = ponHealth(p);
                    const r = h === 'offline' ? 2 : h === 'warning' ? 1 : 0;
                    if (r > bestRank) bestRank = r;
                  }
                  return bestRank;
                };
                const ra = rankOf(a), rb = rankOf(b);
                if (ra !== rb) return ra - rb;
                return a.name.localeCompare(b.name);
              })
            : [...filteredOlts].sort((a, b) => a.name.localeCompare(b.name))
        ).map((olt) => {
          const isExpanded = expandedOltIds.includes(olt.id);
          const isOltActive = selectedOltId === olt.id;

          const slots = Array.from(new Set(olt.ponPorts.map(p => p.slotIndex || 1))).sort((a, b) => a - b);

          const oltWorst: BoxSignalStatus = (!isSimulationActive || !ponSimData)
            ? 'normal'
            : (() => {
                let bestRank = 0;
                let best: 'normal' | 'warning' | 'offline' = 'normal';
                for (const pon of olt.ponPorts) {
                  const h = ponHealth(pon);
                  const r = h === 'offline' ? 2 : h === 'warning' ? 1 : 0;
                  if (r > bestRank) { bestRank = r; best = h; }
                }
                return (best === 'offline' ? 'offline' : best === 'warning' ? 'warning' : 'normal') as BoxSignalStatus;
              })();

          return (
            <div
              key={olt.id}
              className={`rounded-xl border transition ${
                isOltActive
                  ? 'border-indigo-500/40 bg-slate-900/60'
                  : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80'
              }`}
            >
              {/* OLT Header */}
              <div
                onClick={() => onToggleExpandOlt(olt.id)}
                className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-800/40 rounded-t-xl"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {olt.name}
                      </span>
                      {oltWorst !== 'normal' && (
                        <span
                          className={`text-base font-bold leading-none ${oltWorst === 'offline' ? 'text-red-500' : 'text-orange-400'} heartbeat`}
                          title={oltWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}
                        >
                          !
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{olt.brand}</span>
                      <span>•</span>
                      <span>{olt.model}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-400">{olt.ponPorts.length} PONs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="p-1 text-slate-500">
                    {olt.chassisType === 'modular' ? (
                      <span title={`Modular (${olt.slotsCount} bandejas)`}>
                        <Layers className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span title="Pizzabox 1U">
                        <Cpu className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </span>

                  {/* Botón Editar OLT */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditOltModal(olt);
                    }}
                    className="p-1 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800 transition"
                    title="Editar OLT"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  {/* Botón Agregar Puerto PON */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPonDirect(olt.id);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition"
                    title="Agregar Puerto PON"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  {olts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar la OLT ${olt.name}?`)) {
                          onDeleteOlt(olt.id);
                        }
                      }}
                      className="p-1 text-slate-600 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      title="Eliminar OLT"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido desplegado: Bandejas y Puertos PON */}
              {isExpanded && (
                <div className="px-2 pb-2 pt-1 border-t border-slate-800/60 space-y-2">
                  {olt.chassisType === 'modular' && slots.length > 1 ? (
                    slots.map(slotNum => {
                      const slotPorts = olt.ponPorts.filter(p => p.slotIndex === slotNum);
                      return (
                        <div key={`slot-${olt.id}-${slotNum}`} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-1.5 pt-1">
                            <div className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              <span>Bandeja / Slot {slotNum}</span>
                            </div>
                            <button
                              onClick={() => onAddPonDirect(olt.id, slotNum)}
                              className="text-slate-400 hover:text-emerald-400 text-[10px] flex items-center gap-0.5"
                              title="Agregar PON a esta bandeja"
                            >
                              <Plus className="w-2.5 h-2.5" /> PON
                            </button>
                          </div>
                          <div className="space-y-0.5">
                            {slotPorts.map((pon: PONPort) => {
                              const isPonSelected = selectedPonId === pon.id;
                              const hasNetwork = Boolean(pon.primaryBox);
const ponWorst: BoxSignalStatus = ponHealth(pon) as BoxSignalStatus;

                              return (
                                <div
                                  key={pon.id}
                                  onClick={() => onSelectPon(olt.id, pon.id)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                    isPonSelected
                                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Zap
                                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                                        isPonSelected ? 'text-amber-300' : 'text-amber-500'
                                      }`}
                                    />
                                    <span className="truncate">{pon.name}</span>
{ponWorst !== 'normal' && (
  <span className={`text-[11px] font-bold leading-none ${ponWorst === 'offline' ? 'text-red-500' : 'text-orange-400'} heartbeat`} title={ponWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}>!</span>
)}
                                    <span
                                      className={`text-[9px] font-mono px-1 rounded ${
                                        isPonSelected
                                          ? 'bg-indigo-700 text-indigo-200'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {pon.slotPort}
                                    </span>
                                  </div>

                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                      hasNetwork
                                        ? isPonSelected
                                          ? 'bg-emerald-500/30 text-emerald-200'
                                          : 'bg-emerald-500/10 text-emerald-400'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {hasNetwork ? 'Con Red' : 'Libre'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="space-y-0.5">
                      {olt.ponPorts.map((pon: PONPort) => {
                        const isPonSelected = selectedPonId === pon.id;
                        const hasNetwork = Boolean(pon.primaryBox);
const ponWorst: BoxSignalStatus = ponHealth(pon) as BoxSignalStatus;

                        return (
                          <div
                            key={pon.id}
                            onClick={() => onSelectPon(olt.id, pon.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                              isPonSelected
                                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Zap
                                className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  isPonSelected ? 'text-amber-300' : 'text-amber-500'
                                }`}
                              />
                              <span className="truncate">{pon.name}</span>
{ponWorst !== 'normal' && (
  <span className={`text-[11px] font-bold leading-none ${ponWorst === 'offline' ? 'text-red-500' : 'text-orange-400'} heartbeat`} title={ponWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}>!</span>
)}
                              <span
                                className={`text-[9px] font-mono px-1 rounded ${
                                  isPonSelected
                                    ? 'bg-indigo-700 text-indigo-200'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {pon.slotPort}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                hasNetwork
                                  ? isPonSelected
                                    ? 'bg-emerald-500/30 text-emerald-200'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {hasNetwork ? 'Con Red' : 'Libre'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Simulación de señal (desplegable) */}
      <div className="border-t border-slate-800/80 bg-slate-950 flex-shrink-0 select-none">
        <button
          onClick={() => setSimOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-900/70 active:bg-slate-900 transition"
          title={simOpen ? 'Ocultar panel de simulación' : 'Mostrar panel de simulación'}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              {simOpen ? (
                <ChevronDown className="w-4 h-4 text-indigo-400" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
            <span className={`p-1 rounded ${isSimulationActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
              <Activity className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-slate-200">Simulación de Señal</span>
            {isSimulationActive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[9px] text-indigo-300 font-semibold">ACTIVA</span>
              </span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${simOpen ? 'rotate-180' : ''}`} />
        </button>

        {simOpen && (
          <div className="px-2.5 pb-3 pt-0.5 max-h-[26rem] overflow-y-auto">
            {simulationPanel}
          </div>
        )}
      </div>
    </aside>
  );
};
