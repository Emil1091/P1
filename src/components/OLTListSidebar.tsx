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
  Activity
} from 'lucide-react';
import type { OLTDevice, PONPort, BoxSignalStatus, SimulationData } from '../types/ftth';
import { calculateParentStatus } from '../utils/simulation';

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
  /** Datos de simulación de señal, para marcar OLTs con fallas */
  simulationData?: SimulationData;
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
  simulationData,
  simulationPanel,
}) => {
  const [simOpen, setSimOpen] = useState(false);
  return (
    <aside className="w-80 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-20 shadow-2xl select-none flex-shrink-0">
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

      {/* Lista de OLTs con bandejas y PONs */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {olts.map((olt) => {
          const isExpanded = expandedOltIds.includes(olt.id);
          const isOltActive = selectedOltId === olt.id;

          const slots = Array.from(new Set(olt.ponPorts.map(p => p.slotIndex || 1))).sort((a, b) => a - b);

          const oltWorst: BoxSignalStatus = (!isSimulationActive || !simulationData)
            ? 'normal'
            : olt.ponPorts.reduce<BoxSignalStatus>((worst, pon) => {
                if (!pon.primaryBox) return worst;
                const s = calculateParentStatus(pon.primaryBox, simulationData);
                if (s === 'offline') return 'offline';
                if (s === 'critical' && worst !== 'offline') return 'critical';
                if (s === 'warning' && worst !== 'offline' && worst !== 'critical') return 'warning';
                return worst;
              }, 'normal');

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
                    <span className="text-xs font-bold text-slate-200 block truncate">
                      {olt.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{olt.brand}</span>
                      <span>•</span>
                      <span>{olt.model}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-400">{olt.ponPorts.length} PONs</span>
  {oltWorst !== 'normal' && (
    <span
      className={`text-[13px] font-bold leading-none ${oltWorst === 'offline' ? 'text-red-500' : 'text-orange-400'}`}
      title={oltWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}
    >
      !
    </span>
  )}
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
