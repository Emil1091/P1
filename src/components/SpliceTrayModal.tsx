import React, { useState } from 'react';
import { X, Plus, Trash2, Cpu, ArrowRightLeft } from 'lucide-react';
import type { DiagramNode, SplitterRatio } from '../types/ftth';
import { getFiberColor } from '../types/ftth';
import { SPLITTER_LOSS, SPLICE_LOSS } from '../utils/opticalBudget';

interface SpliceModalProps {
  node: DiagramNode;
  onClose: () => void;
  onUpdate: (updatedNode: DiagramNode) => void;
}

export const SpliceTrayModal: React.FC<SpliceModalProps> = ({ node, onClose, onUpdate }) => {
  const incomingFibersCount = node.cableFibers || 12;
  const outgoingFibersCount = node.fibers || 12;

  const [splices, setSplices] = useState(node.splices || []);
  const [selectedFrom, setSelectedFrom] = useState<number | string | null>(null);
  const [internalSplitters, setInternalSplitters] = useState<Array<{ id: string; name: string; ratio: SplitterRatio }>>([
    { id: 'S1', name: 'Splitter Interno 1:8', ratio: 8 }
  ]);

  const handleToggleSplice = (from: number | string, toFiber: number) => {
    const existingIndex = splices.findIndex(s => s.from === from && s.toFiber === toFiber);
    if (existingIndex >= 0) {
      const updated = splices.filter((_, idx) => idx !== existingIndex);
      setSplices(updated);
    } else {
      const updated = [...splices, { from, to: 'out', toFiber }];
      setSplices(updated);
    }
  };

  const handleSave = () => {
    onUpdate({
      ...node,
      splices
    });
    onClose();
  };

  const addInternalSplitter = () => {
    const nextNum = internalSplitters.length + 1;
    setInternalSplitters([
      ...internalSplitters,
      { id: `S${nextNum}`, name: `Splitter Interno 1:4`, ratio: 4 }
    ]);
  };

  const removeInternalSplitter = (id: string) => {
    setInternalSplitters(internalSplitters.filter(s => s.id !== id));
    setSplices(splices.filter(s => typeof s.from === 'string' && !s.from.startsWith(id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Bandeja de Empalmes & Mufa: <span className="text-indigo-400">{node.name}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Norma TIA-598 • Fusiones hilo a hilo (~{SPLICE_LOSS} dB por fusión) • Capacidad: {incomingFibersCount} In / {outgoingFibersCount} Out
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Total fusiones activas:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                {splices.length}
              </span>
            </div>
            <button
              onClick={addInternalSplitter}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Splitter Interno
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
                <span>Cable de Entrada (Alimentador / Hilos)</span>
                <span className="text-xs text-slate-500 font-mono">{incomingFibersCount} FO</span>
              </h3>
              
              <div className="space-y-2">
                {Array.from({ length: incomingFibersCount }).map((_, i) => {
                  const fiberNum = i + 1;
                  const color = getFiberColor(fiberNum);
                  const isFused = splices.some(s => s.from === fiberNum);
                  const isSelected = selectedFrom === fiberNum;

                  return (
                    <div
                      key={`in-fiber-${fiberNum}`}
                      onClick={() => setSelectedFrom(isSelected ? null : fiberNum)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : isFused
                          ? 'border-emerald-500/30 bg-slate-900/90'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full border border-black/40 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                        <span className="font-mono text-slate-300">
                          Hilo {fiberNum.toString().padStart(2, '0')} - {color.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFused ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Fusionado
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Libre</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {internalSplitters.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                    Splitters en Bandeja
                  </h4>
                  <div className="space-y-3">
                    {internalSplitters.map((sp) => (
                      <div key={sp.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-200">{sp.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono">-{SPLITTER_LOSS[sp.ratio]} dB</span>
                            <button
                              onClick={() => removeInternalSplitter(sp.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 mt-2">
                          {Array.from({ length: sp.ratio }).map((_, idx) => {
                            const portKey = `${sp.id}:out:${idx + 1}`;
                            const isSelected = selectedFrom === portKey;
                            const isFused = splices.some(s => s.from === portKey);

                            return (
                              <button
                                key={portKey}
                                onClick={() => setSelectedFrom(isSelected ? null : portKey)}
                                className={`p-1.5 rounded text-[10px] font-mono transition border ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-400'
                                    : isFused
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                }`}
                              >
                                Out {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
                <span>Cables de Salida (Distribución / Derivados)</span>
                <span className="text-xs text-slate-500 font-mono">{outgoingFibersCount} FO</span>
              </h3>

              <div className="space-y-2">
                {Array.from({ length: outgoingFibersCount }).map((_, i) => {
                  const outFiberNum = i + 1;
                  const color = getFiberColor(outFiberNum);
                  const matchedSplice = splices.find(s => s.toFiber === outFiberNum);

                  return (
                    <div
                      key={`out-fiber-${outFiberNum}`}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                        matchedSplice
                          ? 'border-indigo-500/40 bg-slate-900/90'
                          : 'border-slate-800 bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full border border-black/40 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                        <span className="font-mono text-slate-300">
                          Salida {outFiberNum.toString().padStart(2, '0')} - {color.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {matchedSplice ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Fus: {typeof matchedSplice.from === 'number' ? `Hilo ${matchedSplice.from}` : matchedSplice.from}
                            </span>
                            <button
                              onClick={() => handleToggleSplice(matchedSplice.from, outFiberNum)}
                              className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-800 rounded"
                              title="Romper fusión"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : selectedFrom ? (
                          <button
                            onClick={() => handleToggleSplice(selectedFrom, outFiberNum)}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Fusionar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Sin fusión</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs text-slate-400">
            {selectedFrom && (
              <span>
                Seleccionado origen:{' '}
                <strong className="text-indigo-400 font-mono">
                  {typeof selectedFrom === 'number' ? `Hilo ${selectedFrom}` : selectedFrom}
                </strong>
                . Haz clic en 'Fusionar' en una salida.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
            >
              Guardar Fusiones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
