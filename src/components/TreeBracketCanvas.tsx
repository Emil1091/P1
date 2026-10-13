import React from 'react';
import {
  Zap,
  Split,
  Plus,
  Trash2,
  Radio
} from 'lucide-react';
import type { FTTHNode, PONPort, SplitterRatio } from '../types/ftth';
import { evaluatePowerLevel } from '../utils/opticalBudget';

interface TreeBracketCanvasProps {
  pon: PONPort;
  onUpdatePrimaryBox: (updatedBox: FTTHNode | undefined) => void;
  onSelectNode?: (node: FTTHNode) => void;
}

export const TreeBracketCanvas: React.FC<TreeBracketCanvasProps> = ({
  pon,
  onUpdatePrimaryBox,
}) => {
  const primaryBox = pon.primaryBox;

  // Agregar caja primaria 1x4 si está vacío
  const handleAddPrimary = (ratio: SplitterRatio = 4) => {
    const newPrimary: FTTHNode = {
      id: `pri-${Date.now().toString().slice(-4)}`,
      name: `Caja Primaria 01`,
      type: 'caja_primaria',
      ratio,
      location: 'Cámara Principal / Poste 01',
      children: [],
    };
    onUpdatePrimaryBox(newPrimary);
  };

  // Agregar caja secundaria al puerto libre del primario
  const handleAddSecondary = (primary: FTTHNode, portIndex: number, ratio: SplitterRatio = 4) => {
    const newSecondary: FTTHNode = {
      id: `sec-${Date.now().toString().slice(-4)}`,
      name: `Caja Secundario 0${portIndex}`,
      type: 'caja_secundaria',
      ratio,
      parentPortIndex: portIndex,
      location: `Distribución - Salida ${portIndex}`,
      children: [],
    };

    const updatedChildren = [...(primary.children || [])];
    const existingIdx = updatedChildren.findIndex(c => c.parentPortIndex === portIndex);
    if (existingIdx >= 0) {
      updatedChildren[existingIdx] = newSecondary;
    } else {
      updatedChildren.push(newSecondary);
    }

    onUpdatePrimaryBox({
      ...primary,
      children: updatedChildren,
    });
  };

  // Agregar caja NAP al puerto libre del secundario
  const handleAddNap = (secondaryId: string, portIndex: number, ratio: SplitterRatio = 8) => {
    if (!primaryBox) return;

    const newNap: FTTHNode = {
      id: `nap-${Date.now().toString().slice(-4)}`,
      name: `Caja NAP 0${portIndex}`,
      type: 'caja_nap',
      ratio,
      parentPortIndex: portIndex,
      location: `Poste Calle / Acceso ${portIndex}`,
      children: [],
    };

    const updateChildrenRecursively = (node: FTTHNode): FTTHNode => {
      if (node.id === secondaryId) {
        const updatedNaps = [...(node.children || [])];
        const existingIdx = updatedNaps.findIndex(c => c.parentPortIndex === portIndex);
        if (existingIdx >= 0) {
          updatedNaps[existingIdx] = newNap;
        } else {
          updatedNaps.push(newNap);
        }
        return { ...node, children: updatedNaps };
      }
      return {
        ...node,
        children: (node.children || []).map(updateChildrenRecursively),
      };
    };

    onUpdatePrimaryBox(updateChildrenRecursively(primaryBox));
  };

  // Eliminar cualquier caja del árbol
  const handleDeleteNode = (id: string) => {
    if (!primaryBox) return;
    if (primaryBox.id === id) {
      onUpdatePrimaryBox(undefined);
      return;
    }

    const removeRecursively = (node: FTTHNode): FTTHNode => {
      return {
        ...node,
        children: (node.children || [])
          .filter(c => c.id !== id)
          .map(removeRecursively),
      };
    };

    onUpdatePrimaryBox(removeRecursively(primaryBox));
  };

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto bg-[#090d16] p-8 flex flex-col justify-start select-none">
      {/* Barra de cabecera del PON */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Diagrama Jerárquico de Llaves: <span className="text-amber-400">{pon.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Slot/Port: {pon.slotPort}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Flujo óptico de izquierda a derecha: PON ➔ Caja Primaria ➔ Cajas Secundarias ➔ Cajas NAP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Potencia TX SFP:</span>
            <span className="font-bold text-emerald-400">+{pon.txPower.toFixed(2)} dBm</span>
          </div>
        </div>
      </div>

      {/* Árbol de llaves de Izquierda a Derecha */}
      <div className="flex items-start gap-8 min-w-max pb-12">
        {/* COLUMNA 1: PUERTO PON */}
        <div className="flex flex-col items-center">
          <div className="w-56 bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Puerto PON OLT</span>
            </div>
            <div className="text-xs text-slate-400 font-mono mb-3">
              {pon.name} ({pon.slotPort})
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">TX Laser:</span>
              <span className="text-emerald-400 font-bold">+{pon.txPower.toFixed(1)} dBm</span>
            </div>

            {/* Salida del cable de fibra hacia el primario */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Salida Óptica</span>
              {!primaryBox && (
                <button
                  onClick={() => handleAddPrimary(4)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> Agregar Primario (1x4)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: CAJA PRIMARIA (SPLITTER 1x4 / 1x2 / 1x8) */}
        {primaryBox && (
          <div className="flex items-start gap-8">
            <div className="flex flex-col">
              <div className="w-64 bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <Split className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200 truncate">{primaryBox.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNode(primaryBox.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                    title="Eliminar caja primaria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                    Splitter 1:{primaryBox.ratio || 4} Primario
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {primaryBox.powerOutput?.toFixed(1)} dBm
                  </span>
                </div>

                {/* Lista de Salidas exactas correspondientes al ratio del primario */}
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Salidas del Splitter ({primaryBox.children.length} / {primaryBox.ratio || 4} en uso)
                  </span>

                  {Array.from({ length: primaryBox.ratio || 4 }).map((_, idx) => {
                    const portNum = idx + 1;
                    const connectedSecondary = primaryBox.children.find(
                      c => c.parentPortIndex === portNum
                    );

                    return (
                      <div
                        key={`prim-out-${portNum}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                      >
                        <span className="font-mono text-slate-300 text-[11px]">
                          Salida #{portNum}
                        </span>

                        {connectedSecondary ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                            {connectedSecondary.name}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddSecondary(primaryBox, portNum, 4)}
                            className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-1 transition"
                            title={`Conectar secundario a la salida #${portNum}`}
                          >
                            <Plus className="w-3 h-3" /> Secundario (1x4)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMNA 3: CAJAS SECUNDARIAS */}
            {primaryBox.children.length > 0 && (
              <div className="flex flex-col gap-8">
                {Array.from({ length: primaryBox.ratio || 4 }).map((_, pIdx) => {
                  const portNum = pIdx + 1;
                  const secNode = primaryBox.children.find(c => c.parentPortIndex === portNum);

                  if (!secNode) return null;

                  return (
                    <div key={secNode.id} className="flex items-start gap-8">
                      {/* Tarjeta de Caja Secundaria */}
                      <div className="w-64 bg-slate-900 border border-sky-500/40 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 truncate">
                            <Split className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-bold text-slate-200 truncate">{secNode.name}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteNode(secNode.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Eliminar caja secundaria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-mono border border-sky-500/20">
                            Splitter 1:{secNode.ratio || 4} Secundario
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {secNode.powerOutput?.toFixed(1)} dBm
                          </span>
                        </div>

                        {/* Salidas hacia Cajas NAP */}
                        <div className="space-y-2 mt-3 pt-3 border-t border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Salidas hacia NAPs ({secNode.children.length} / {secNode.ratio || 4})
                          </span>

                          {Array.from({ length: secNode.ratio || 4 }).map((_, sIdx) => {
                            const secPortNum = sIdx + 1;
                            const connectedNap = secNode.children.find(
                              c => c.parentPortIndex === secPortNum
                            );

                            return (
                              <div
                                key={`sec-${secNode.id}-out-${secPortNum}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                              >
                                <span className="font-mono text-slate-300 text-[11px]">
                                  Salida #{secPortNum}
                                </span>

                                {connectedNap ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                                    {connectedNap.name}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAddNap(secNode.id, secPortNum, 8)}
                                    className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 flex items-center gap-1 transition"
                                    title={`Conectar caja NAP 1x8 a la salida #${secPortNum}`}
                                  >
                                    <Plus className="w-3 h-3" /> NAP (1x8)
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* COLUMNA 4: CAJAS NAP (1x8 / 1x16) */}
                      {secNode.children.length > 0 && (
                        <div className="flex flex-col gap-4">
                          {secNode.children.map(napNode => {
                            const powerStatus = evaluatePowerLevel(napNode.powerOutput);

                            return (
                              <div
                                key={napNode.id}
                                className="w-60 bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 truncate">
                                    <Radio className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-slate-200 truncate">
                                      {napNode.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteNode(napNode.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition"
                                    title="Eliminar caja NAP"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="text-[11px] mb-2">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20">
                                    NAP 1:{napNode.ratio || 8} (Salida Cliente)
                                  </span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono mb-2">
                                  <span className="text-slate-400 text-[10px]">Potencia Cliente:</span>
                                  <span className="font-bold text-emerald-400">
                                    {napNode.powerOutput?.toFixed(2)} dBm
                                  </span>
                                </div>

                                <div
                                  className={`px-2 py-1 rounded text-[10px] font-semibold text-center border ${powerStatus.badgeBg} ${powerStatus.badgeText}`}
                                >
                                  {powerStatus.label}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
