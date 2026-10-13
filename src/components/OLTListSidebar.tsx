import React from 'react';
import {
  Server,
  Zap,
  ChevronRight,
  ChevronDown,
  Plus,
  Radio,
  Sliders
} from 'lucide-react';
import type { OLTDevice, PONPort } from '../types/ftth';

interface OLTListSidebarProps {
  olts: OLTDevice[];
  selectedOltId: string | null;
  selectedPonId: string | null;
  expandedOltIds: string[];
  onToggleExpandOlt: (oltId: string) => void;
  onSelectPon: (oltId: string, ponId: string) => void;
  onAddOlt: () => void;
  onAddPon: (oltId: string) => void;
}

export const OLTListSidebar: React.FC<OLTListSidebarProps> = ({
  olts,
  selectedOltId,
  selectedPonId,
  expandedOltIds,
  onToggleExpandOlt,
  onSelectPon,
  onAddOlt,
  onAddPon,
}) => {
  return (
    <aside className="w-80 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-20 shadow-2xl select-none">
      {/* Header del panel OLT */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
              OLTs & Puertos PON
            </h2>
            <p className="text-[10px] text-slate-500">Cabeceras y chasis GPON</p>
          </div>
        </div>

        <button
          onClick={onAddOlt}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1 shadow-sm transition"
          title="Agregar nueva OLT"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold pr-0.5">OLT</span>
        </button>
      </div>

      {/* Lista de OLTs colapsables */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {olts.map((olt) => {
          const isExpanded = expandedOltIds.includes(olt.id);
          const isOltActive = selectedOltId === olt.id;

          return (
            <div
              key={olt.id}
              className={`rounded-xl border transition ${
                isOltActive
                  ? 'border-indigo-500/40 bg-slate-900/60'
                  : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              {/* OLT Item Header */}
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
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {olt.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {olt.location} • {olt.ponPorts.length} PONs
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPon(olt.id);
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                  title="Agregar puerto PON a esta OLT"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de Puertos PON de la OLT */}
              {isExpanded && (
                <div className="px-2 pb-2 pt-1 border-t border-slate-800/60 space-y-1">
                  {olt.ponPorts.map((pon: PONPort) => {
                    const isPonSelected = selectedPonId === pon.id;
                    const hasNetwork = Boolean(pon.primaryBox);

                    return (
                      <div
                        key={pon.id}
                        onClick={() => onSelectPon(olt.id, pon.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                          isPonSelected
                            ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Zap
                            className={`w-3.5 h-3.5 ${
                              isPonSelected ? 'text-amber-300' : 'text-amber-500'
                            }`}
                          />
                          <span className="truncate">{pon.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1 rounded ${
                              isPonSelected
                                ? 'bg-indigo-700/60 text-indigo-200'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {pon.slotPort}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px]">
                          {hasNetwork ? (
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono ${
                                isPonSelected
                                  ? 'bg-emerald-500/30 text-emerald-200'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              Activo
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">Vacío</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-500" />
          <span>Topología: 1x4 + 1x4 + 1x8</span>
        </div>
        <Sliders className="w-3.5 h-3.5 text-slate-600" />
      </div>
    </aside>
  );
};
