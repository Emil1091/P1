import React, { useRef, useState, useEffect } from 'react';
import {
  Zap,
  Split,
  Plus,
  Trash2,
  Radio,
  ChevronRight,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';
import type { FTTHNode, PONPort, SplitterRatio } from '../types/ftth';
import { CurlyBracket } from './CurlyBracket';

interface SynopticTreeCanvasProps {
  pon: PONPort;
  onUpdatePrimaryBox: (updatedBox: FTTHNode | undefined) => void;
}

export const SynopticTreeCanvas: React.FC<SynopticTreeCanvasProps> = ({
  pon,
  onUpdatePrimaryBox,
}) => {
  const primaryBox = pon.primaryBox;

  // Refs para medir alturas dinámicas de las columnas y ajustar las llaves SVG exactamente
  const primaryBracketRef = useRef<HTMLDivElement>(null);
  const [primaryBracketHeight, setPrimaryBracketHeight] = useState(120);

  // Toggle colapsar / minimizar caja
  const handleToggleCollapse = (nodeId: string) => {
    if (!primaryBox) return;

    const toggleRecursively = (node: FTTHNode): FTTHNode => {
      if (node.id === nodeId) {
        return { ...node, isCollapsed: !node.isCollapsed };
      }
      return {
        ...node,
        children: (node.children || []).map(toggleRecursively),
      };
    };

    onUpdatePrimaryBox(toggleRecursively(primaryBox));
  };

  // Expandir todas o colapsar todas
  const handleCollapseAll = (collapse: boolean) => {
    if (!primaryBox) return;
    const setAll = (node: FTTHNode): FTTHNode => ({
      ...node,
      isCollapsed: collapse,
      children: (node.children || []).map(setAll)
    });
    onUpdatePrimaryBox(setAll(primaryBox));
  };

  // Agregar caja primaria 1x4 si está vacío
  const handleAddPrimary = (ratio: SplitterRatio = 4) => {
    const newPrimary: FTTHNode = {
      id: `pri-${Date.now().toString().slice(-4)}`,
      name: `Caja Primaria 1x${ratio}`,
      type: 'caja_primaria',
      ratio,
      isCollapsed: false,
      children: [],
    };
    onUpdatePrimaryBox(newPrimary);
  };

  // Agregar caja secundaria al puerto libre del primario
  const handleAddSecondary = (primary: FTTHNode, portIndex: number, ratio: SplitterRatio = 4) => {
    const newSecondary: FTTHNode = {
      id: `sec-${Date.now().toString().slice(-4)}-${portIndex}`,
      name: `Secundario #${portIndex} (1x${ratio})`,
      type: 'caja_secundaria',
      ratio,
      parentPortIndex: portIndex,
      isCollapsed: false,
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
      id: `nap-${Date.now().toString().slice(-4)}-${portIndex}`,
      name: `NAP #${portIndex} (1x${ratio})`,
      type: 'caja_nap',
      ratio,
      parentPortIndex: portIndex,
      isCollapsed: false,
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

  // Medir la altura de los secundarios activos para que la llave del primario calce perfecto
  useEffect(() => {
    if (primaryBracketRef.current) {
      const h = primaryBracketRef.current.offsetHeight;
      setPrimaryBracketHeight(h > 40 ? h : 60);
    }
  }, [primaryBox]);

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto bg-[#0b0f19] p-6 select-none flex flex-col justify-start">
      {/* Barra de título compacta */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Cuadro Sinóptico de Llaves:</span>
              <span className="text-amber-400 font-mono">{pon.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({pon.slotPort})</span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Esquema de derivación balanceada: PON ➔ Primario ➔ Secundarios ➔ NAPs
            </p>
          </div>
        </div>

        {primaryBox && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCollapseAll(true)}
              className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition"
              title="Minimizar todas las llaves"
            >
              <Minimize2 className="w-3 h-3" /> Minimizar Todo
            </button>
            <button
              onClick={() => handleCollapseAll(false)}
              className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition"
              title="Expandir todas las llaves"
            >
              <Maximize2 className="w-3 h-3" /> Expandir Todo
            </button>
          </div>
        )}
      </div>

      {/* ÁRBOL DE LLAVES SINÓPTICO */}
      <div className="flex items-center gap-1 min-w-max py-4">
        {/* NIVEL 1: NODO PON (Idea General) */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/50 shadow-md flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="text-left">
              <span className="text-xs font-bold text-slate-100 block">{pon.name}</span>
              <span className="text-[9px] font-mono text-slate-400 block">{pon.slotPort}</span>
            </div>
          </div>

          {/* Llave del PON hacia la Caja Primaria */}
          {primaryBox ? (
            <CurlyBracket height={50} width={22} color="#f59e0b" strokeWidth={2.5} />
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <span className="text-slate-600 text-xs">➔</span>
              <button
                onClick={() => handleAddPrimary(4)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Caja Primaria (1x4)
              </button>
            </div>
          )}
        </div>

        {/* NIVEL 2: CAJA PRIMARIA */}
        {primaryBox && (
          <div className="flex items-center gap-1">
            {/* Nodo Primario */}
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-md flex items-center gap-2">
              <button
                onClick={() => handleToggleCollapse(primaryBox.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition"
                title={primaryBox.isCollapsed ? 'Desplegar secundarias' : 'Minimizar secundarias'}
              >
                {primaryBox.isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
              <Split className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-200 block truncate">{primaryBox.name}</span>
                <span className="text-[9px] font-mono text-indigo-300 block">Splitter 1:{primaryBox.ratio || 4}</span>
              </div>
              <button
                onClick={() => handleDeleteNode(primaryBox.id)}
                className="text-slate-600 hover:text-red-400 p-0.5 ml-1 transition"
                title="Eliminar primario"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Llave del Primario hacia sus 4 Cajas Secundarias */}
            {!primaryBox.isCollapsed && (
              <div className="flex items-center gap-1">
                <CurlyBracket
                  height={primaryBracketHeight}
                  width={26}
                  color="#6366f1"
                  strokeWidth={2.5}
                />

                {/* NIVEL 3: COLUMNA DE LAS 4 CAJAS SECUNDARIAS */}
                <div
                  ref={primaryBracketRef}
                  className="flex flex-col justify-around gap-3 py-1"
                >
                  {Array.from({ length: primaryBox.ratio || 4 }).map((_, secIdx) => {
                    const portNum = secIdx + 1;
                    const secNode = primaryBox.children.find(c => c.parentPortIndex === portNum);

                    return (
                      <div key={`sec-slot-${portNum}`} className="flex items-center gap-1">
                        {secNode ? (
                          // Caja Secundaria conectada
                          <div className="flex items-center gap-1">
                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-sky-500/40 shadow-sm flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleCollapse(secNode.id)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition"
                                title={secNode.isCollapsed ? 'Desplegar NAPs' : 'Minimizar NAPs'}
                              >
                                {secNode.isCollapsed ? (
                                  <ChevronRight className="w-3 h-3 text-sky-400" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-sky-400" />
                                )}
                              </button>
                              <Split className="w-3 h-3 text-sky-400 flex-shrink-0" />
                              <div className="text-left">
                                <span className="text-[11px] font-bold text-slate-200 block truncate">
                                  {secNode.name}
                                </span>
                                <span className="text-[9px] font-mono text-sky-300 block">
                                  Salida #{portNum} • 1:{secNode.ratio || 4}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteNode(secNode.id)}
                                className="text-slate-600 hover:text-red-400 p-0.5 ml-1 transition"
                                title="Eliminar secundario"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Llave del Secundario hacia sus Cajas NAP */}
                            {!secNode.isCollapsed && (
                              <div className="flex items-center gap-1">
                                <CurlyBracket
                                  height={Math.max((secNode.ratio || 4) * 28, 40)}
                                  width={24}
                                  color="#38bdf8"
                                  strokeWidth={2}
                                />

                                {/* NIVEL 4: COLUMNA DE LAS CAJAS NAP */}
                                <div className="flex flex-col gap-1.5 py-0.5">
                                  {Array.from({ length: secNode.ratio || 4 }).map((_, napIdx) => {
                                    const napPortNum = napIdx + 1;
                                    const napNode = secNode.children.find(
                                      c => c.parentPortIndex === napPortNum
                                    );

                                    return (
                                      <div key={`nap-slot-${secNode.id}-${napPortNum}`} className="flex items-center gap-1">
                                        {napNode ? (
                                          // Caja NAP Conectada (Ultra-compacta)
                                          <div className="px-2 py-1 rounded-md bg-slate-900 border border-emerald-500/40 shadow-sm flex items-center gap-1.5">
                                            <Radio className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                            <div className="text-left">
                                              <span className="text-[10px] font-bold text-slate-200 block">
                                                {napNode.name}
                                              </span>
                                              <span className="text-[8px] font-mono text-emerald-400 block">
                                                Salida #{napPortNum} • 1:{napNode.ratio || 8}
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteNode(napNode.id)}
                                              className="text-slate-600 hover:text-red-400 p-0.5 ml-1 transition"
                                              title="Eliminar NAP"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          // Ranura libre para agregar NAP
                                          <button
                                            onClick={() => handleAddNap(secNode.id, napPortNum, 8)}
                                            className="px-2 py-1 rounded border border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition"
                                            title={`Agregar Caja NAP a la salida #${napPortNum}`}
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                            <span>Salida #{napPortNum}: + NAP (1x8)</span>
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Ranura libre para agregar Secundario
                          <button
                            onClick={() => handleAddSecondary(primaryBox, portNum, 4)}
                            className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/60 hover:bg-slate-900 text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition"
                            title={`Agregar Caja Secundaria a la salida #${portNum}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Salida #{portNum}: + Secundario (1x4)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
