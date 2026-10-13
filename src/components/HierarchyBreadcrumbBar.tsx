import React from 'react';
import {
  Server,
  Zap,
  Split,
  Radio,
  ChevronRight,
  MapPin
} from 'lucide-react';
import type { BreadcrumbStep } from '../types/ftth';

interface HierarchyBreadcrumbBarProps {
  oltName: string;
  ponName: string;
  slotPort: string;
  steps: BreadcrumbStep[];
}

export const HierarchyBreadcrumbBar: React.FC<HierarchyBreadcrumbBarProps> = ({
  oltName,
  ponName,
  slotPort,
  steps,
}) => {
  if (steps.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 mb-4 flex items-center gap-2 overflow-x-auto text-xs backdrop-blur-md shadow-lg select-none">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
        Ruta de Fibra:
      </span>

      {/* OLT */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950 border border-slate-800/80 flex-shrink-0">
        <Server className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-slate-200">{oltName}</span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

      {/* PON */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950 border border-slate-800/80 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-slate-200">{ponName}</span>
        <span className="text-[9px] font-mono text-slate-400">({slotPort})</span>
      </div>

      {/* Pasos por cada caja (Primario -> Secundario -> NAP) */}
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border flex-shrink-0 transition ${
                isLast
                  ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800/80 text-slate-300'
              }`}
            >
              {step.type === 'caja_nap' ? (
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Split className="w-3.5 h-3.5 text-sky-400" />
              )}

              <span className="font-semibold truncate">{step.name}</span>

              {step.portUsed && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                  Salida #{step.portUsed}
                </span>
              )}

              {step.location && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 max-w-[150px] truncate">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="truncate">{step.location}</span>
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
