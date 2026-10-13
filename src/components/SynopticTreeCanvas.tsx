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
  Maximize2,
  Edit2,
  MapPin
} from 'lucide-react';
import type { FTTHNode, PONPort, SplitterRatio, BreadcrumbStep, SimulationData } from '../types/ftth';
import { calculateBoxStatus, calculateParentStatus, STATUS_COLORS, averageSignal } from '../utils/simulation';
import { CurlyBracket } from './CurlyBracket';

interface SynopticTreeCanvasProps {
  pon: PONPort;
  oltName: string;
  selectedBoxId: string | null;
  onSelectBox: (boxId: string, steps: BreadcrumbStep[]) => void;
  onUpdatePrimaryBox: (updatedBox: FTTHNode | undefined) => void;
  onOpenEditBoxModal: (node: FTTHNode) => void;
  /** Datos de simulación de señal. Si undefined, la simulación está inactiva. */
  simulationData?: SimulationData;
}

export const SynopticTreeCanvas: React.FC<SynopticTreeCanvasProps> = ({
  pon,
  oltName,
  selectedBoxId,
  onSelectBox,
  onUpdatePrimaryBox,
  onOpenEditBoxModal,
  simulationData,
}) => {
  const simActive = !!simulationData;
  const primaryBox = pon.primaryBox;

  const primaryBracketRef = useRef<HTMLDivElement>(null);
  const selectedNodeRef = useRef<HTMLDivElement>(null);
  const [primaryBracketHeight, setPrimaryBracketHeight] = useState(120);

  const [addingParentInfo, setAddingParentInfo] = useState<{
    parentId: string;
    parentType: 'pon' | 'primario' | 'secundario';
    portIndex: number;
  } | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<SplitterRatio>(4);

  // Auto-scroll suave para centrar la caja seleccionada si está en pantalla
  useEffect(() => {
    if (selectedBoxId && selectedNodeRef.current) {
      selectedNodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedBoxId]);

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

  const handleCollapseAll = (collapse: boolean) => {
    if (!primaryBox) return;
    const setAll = (node: FTTHNode): FTTHNode => ({
      ...node,
      isCollapsed: collapse,
      children: (node.children || []).map(setAll)
    });
    onUpdatePrimaryBox(setAll(primaryBox));
  };

  const handleConfirmAddBox = () => {
    if (!addingParentInfo) return;

    if (addingParentInfo.parentType === 'pon') {
      const newPrimary: FTTHNode = {
        id: `pri-${Date.now().toString().slice(-4)}`,
        name: `Caja Primaria 1x${selectedRatio}`,
        type: 'caja_primaria',
        ratio: selectedRatio,
        isCollapsed: false,
        children: [],
      };
      onUpdatePrimaryBox(newPrimary);
    } else if (addingParentInfo.parentType === 'primario' && primaryBox) {
      const portNum = addingParentInfo.portIndex;
      const newSecondary: FTTHNode = {
        id: `sec-${Date.now().toString().slice(-4)}-${portNum}`,
        name: `Secundario #${portNum} (1x${selectedRatio})`,
        type: 'caja_secundaria',
        ratio: selectedRatio,
        parentPortIndex: portNum,
        isCollapsed: false,
        children: [],
      };

      const updatedChildren = [...(primaryBox.children || [])];
      const existingIdx = updatedChildren.findIndex(c => c.parentPortIndex === portNum);
      if (existingIdx >= 0) {
        updatedChildren[existingIdx] = newSecondary;
      } else {
        updatedChildren.push(newSecondary);
      }
      onUpdatePrimaryBox({ ...primaryBox, children: updatedChildren });
    } else if (addingParentInfo.parentType === 'secundario' && primaryBox) {
      const secId = addingParentInfo.parentId;
      const portNum = addingParentInfo.portIndex;
      const newNap: FTTHNode = {
        id: `nap-${Date.now().toString().slice(-4)}-${portNum}`,
        name: `NAP #${portNum} (1x${selectedRatio})`,
        type: 'caja_nap',
        ratio: selectedRatio,
        parentPortIndex: portNum,
        isCollapsed: false,
        children: [],
      };

      const updateChildrenRecursively = (node: FTTHNode): FTTHNode => {
        if (node.id === secId) {
          const updatedNaps = [...(node.children || [])];
          const existingIdx = updatedNaps.findIndex(c => c.parentPortIndex === portNum);
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
    }

    setAddingParentInfo(null);
  };

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

  useEffect(() => {
    if (primaryBracketRef.current) {
      const h = primaryBracketRef.current.offsetHeight;
      setPrimaryBracketHeight(h > 40 ? h : 60);
    }
  }, [primaryBox]);

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto bg-[#0b0f19] p-6 select-none flex flex-col justify-start">
      {/* Barra de cabecera */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>{oltName}</span>
              <span className="text-slate-500">/</span>
              <span className="text-amber-400 font-mono">{pon.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({pon.slotPort})</span>
            </h2>
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
        {/* NIVEL 1: NODO PON */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/50 shadow-md flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="text-left">
              <span className="text-xs font-bold text-slate-100 block">{pon.name}</span>
              <span className="text-[9px] font-mono text-slate-400 block">{pon.slotPort}</span>
            </div>
          </div>

          {primaryBox ? (
            <CurlyBracket height={50} width={22} color="#f59e0b" strokeWidth={2.5} />
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <span className="text-slate-600 text-xs">➔</span>
              {addingParentInfo?.parentType === 'pon' ? (
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-indigo-500/50">
                  <select
                    value={selectedRatio}
                    onChange={(e) => setSelectedRatio(Number(e.target.value) as SplitterRatio)}
                    className="bg-slate-950 text-xs px-2 py-1 rounded text-slate-200 border border-slate-800 focus:outline-none"
                  >
                    <option value={2}>Splitter 1:2</option>
                    <option value={4}>Splitter 1:4</option>
                    <option value={8}>Splitter 1:8</option>
                    <option value={16}>Splitter 1:16</option>
                  </select>
                  <button
                    onClick={handleConfirmAddBox}
                    className="px-2 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Crear Primario
                  </button>
                  <button
                    onClick={() => setAddingParentInfo(null)}
                    className="px-1.5 py-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedRatio(4);
                    setAddingParentInfo({ parentId: pon.id, parentType: 'pon', portIndex: 1 });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Caja Primaria
                </button>
              )}
            </div>
          )}
        </div>

        {/* NIVEL 2: CAJA PRIMARIA */}
        {primaryBox && (
          <div className="flex items-center gap-1">
            {(() => {
              const priStatus = simActive ? calculateParentStatus(primaryBox, simulationData!) : null;
              const priSimCfg = priStatus ? STATUS_COLORS[priStatus] : null;
              return (
            <div
              ref={selectedBoxId === primaryBox.id ? selectedNodeRef : undefined}
              onClick={() => {
                onSelectBox(primaryBox.id, [
                  { id: primaryBox.id, name: primaryBox.name, type: primaryBox.type, location: primaryBox.location }
                ]);
              }}
              className={`px-3 py-2 rounded-xl bg-slate-900 border shadow-md flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                selectedBoxId === primaryBox.id
                  ? 'border-amber-400 ring-4 ring-amber-400/40 bg-amber-950/40 shadow-xl shadow-amber-500/20 scale-105'
                  : simActive && priSimCfg
                  ? `${priSimCfg.border} ${priSimCfg.bg}`
                  : 'border-indigo-500/40 hover:border-indigo-400'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCollapse(primaryBox.id);
                }}
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
                <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-300">
                  <span>1:{primaryBox.ratio || 4}</span>
                  {primaryBox.location && (
                    <span className="text-slate-400 flex items-center gap-0.5 truncate max-w-[100px]">
                      • <MapPin className="w-2.5 h-2.5 text-slate-500" /> {primaryBox.location}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditBoxModal(primaryBox);
                }}
                className="text-slate-400 hover:text-sky-300 p-0.5 ml-1 transition"
                title="Editar datos de la caja"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(primaryBox.id);
                }}
                className="text-slate-600 hover:text-red-400 p-0.5 ml-0.5 transition"
                title="Eliminar primario"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              {/* Badge de simulación en caja primaria */}
              {simActive && priSimCfg && priStatus !== 'normal' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1 ${priSimCfg.badge}`}>
                  {priSimCfg.label}
                </span>
              )}
            </div>
            );})()}

            {/* Llave hacia Secundarios */}
            {!primaryBox.isCollapsed && (
              <div className="flex items-center gap-1">
                <CurlyBracket
                  height={primaryBracketHeight}
                  width={26}
                  color="#6366f1"
                  strokeWidth={2.5}
                />

                {/* NIVEL 3: COLUMNA DE LAS CAJAS SECUNDARIAS */}
                <div
                  ref={primaryBracketRef}
                  className="flex flex-col justify-around gap-3 py-1"
                >
                  {Array.from({ length: primaryBox.ratio || 4 }).map((_, secIdx) => {
                    const portNum = secIdx + 1;
                    const secNode = primaryBox.children.find(c => c.parentPortIndex === portNum);

                    return (
                      <div key={`sec-slot-${portNum}`} className="flex items-center gap-1">
                        {secNode ? (() => {
                          const secStatus = simActive ? calculateParentStatus(secNode, simulationData!) : null;
                          const secSimCfg = secStatus ? STATUS_COLORS[secStatus] : null;
                          return (
                          <div className="flex items-center gap-1">
                            <div
                              ref={selectedBoxId === secNode.id ? selectedNodeRef : undefined}
                              onClick={() => {
                                onSelectBox(secNode.id, [
                                  { id: primaryBox.id, name: primaryBox.name, type: primaryBox.type, portUsed: portNum, location: primaryBox.location },
                                  { id: secNode.id, name: secNode.name, type: secNode.type, location: secNode.location }
                                ]);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg bg-slate-900 border shadow-sm flex items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                                selectedBoxId === secNode.id
                                  ? 'border-amber-400 ring-4 ring-amber-400/40 bg-amber-950/40 shadow-xl shadow-amber-500/20 scale-105'
                                  : simActive && secSimCfg
                                  ? `${secSimCfg.border} ${secSimCfg.bg}`
                                  : 'border-sky-500/40 hover:border-sky-400'
                              }`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCollapse(secNode.id);
                                }}
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
                                <div className="flex items-center gap-1 text-[9px] font-mono text-sky-300">
                                  <span>Salida #{portNum} • 1:{secNode.ratio || 4}</span>
                                  {secNode.location && (
                                    <span className="text-slate-400 flex items-center gap-0.5 truncate max-w-[100px]">
                                      • <MapPin className="w-2.5 h-2.5 text-slate-500" /> {secNode.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEditBoxModal(secNode);
                                }}
                                className="text-slate-400 hover:text-sky-300 p-0.5 ml-1 transition"
                                title="Editar datos"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNode(secNode.id);
                                }}
                                className="text-slate-600 hover:text-red-400 p-0.5 ml-0.5 transition"
                                title="Eliminar secundario"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                              {/* Badge simulación secundario */}
                              {simActive && secSimCfg && secStatus !== 'normal' && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1 ${secSimCfg.badge}`}>
                                  {secSimCfg.label}
                                </span>
                              )}
                            </div>

                            {/* Llave hacia NAPs */}
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
                                        {napNode ? (() => {
                                          const napClients = simActive ? (simulationData![napNode.id] ?? []) : [];
                                          const napStatus = simActive ? calculateBoxStatus(napClients) : null;
                                          const napSimCfg = napStatus ? STATUS_COLORS[napStatus] : null;
                                          const napAvg = simActive && napClients.length > 0 ? averageSignal(napClients) : null;
                                          return (
                                          <div
                                            ref={selectedBoxId === napNode.id ? selectedNodeRef : undefined}
                                            onClick={() => {
                                              onSelectBox(napNode.id, [
                                                { id: primaryBox.id, name: primaryBox.name, type: primaryBox.type, portUsed: portNum, location: primaryBox.location },
                                                { id: secNode.id, name: secNode.name, type: secNode.type, portUsed: napPortNum, location: secNode.location },
                                                { id: napNode.id, name: napNode.name, type: napNode.type, location: napNode.location }
                                              ]);
                                            }}
                                            className={`px-2 py-1 rounded-md bg-slate-900 border shadow-sm flex items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                                              selectedBoxId === napNode.id
                                                ? 'border-amber-400 ring-4 ring-amber-400/40 bg-amber-950/40 shadow-xl shadow-amber-500/20 scale-105'
                                                : simActive && napSimCfg
                                                ? `${napSimCfg.border} ${napSimCfg.bg}`
                                                : 'border-emerald-500/40 hover:border-emerald-400'
                                            }`}
                                          >
                                            <Radio className={`w-3 h-3 flex-shrink-0 ${simActive && napSimCfg ? napSimCfg.dot.replace('bg-', 'text-') : 'text-emerald-400'}`} />
                                            <div className="text-left">
                                              <span className="text-[10px] font-bold text-slate-200 block truncate">
                                                {napNode.name}
                                              </span>
                                              <div className="flex items-center gap-1 text-[8px] font-mono text-emerald-400">
                                                <span>Salida #{napPortNum} • 1:{napNode.ratio || 8}</span>
                                                {napNode.location && (
                                                  <span className="text-slate-400 flex items-center gap-0.5 truncate max-w-[80px]">
                                                    • {napNode.location}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {/* Badge de señal NAP */}
                                            {simActive && napSimCfg && (
                                              <div className="flex flex-col items-end gap-0.5 ml-1">
                                                <span className={`px-1 py-0.5 rounded-full text-[8px] font-bold ${napSimCfg.badge}`}>
                                                  {napSimCfg.label}
                                                </span>
                                                {napAvg !== null && (
                                                  <span className="text-[8px] font-mono text-slate-500">{napAvg} dBm</span>
                                                )}
                                              </div>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenEditBoxModal(napNode);
                                              }}
                                              className="text-slate-400 hover:text-emerald-300 p-0.5 ml-1 transition"
                                              title="Editar NAP"
                                            >
                                              <Edit2 className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNode(napNode.id);
                                              }}
                                              className="text-slate-600 hover:text-red-400 p-0.5 ml-0.5 transition"
                                              title="Eliminar NAP"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                          );
                                        })() : (
                                          addingParentInfo?.parentId === secNode.id && addingParentInfo.portIndex === napPortNum ? (
                                            <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-emerald-500/50 text-[10px]">
                                              <select
                                                value={selectedRatio}
                                                onChange={(e) => setSelectedRatio(Number(e.target.value) as SplitterRatio)}
                                                className="bg-slate-950 px-1 py-0.5 rounded text-slate-200 border border-slate-800"
                                              >
                                                <option value={4}>1:4</option>
                                                <option value={8}>1:8</option>
                                                <option value={16}>1:16</option>
                                              </select>
                                              <button
                                                onClick={handleConfirmAddBox}
                                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                                              >
                                                +
                                              </button>
                                              <button
                                                onClick={() => setAddingParentInfo(null)}
                                                className="px-1 text-slate-400 hover:text-white"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setSelectedRatio(8);
                                                setAddingParentInfo({ parentId: secNode.id, parentType: 'secundario', portIndex: napPortNum });
                                              }}
                                              className="px-2 py-1 rounded border border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition"
                                              title={`Agregar Caja NAP a la salida #${napPortNum}`}
                                            >
                                              <Plus className="w-2.5 h-2.5" />
                                              <span>Salida #{napPortNum}: + NAP</span>
                                            </button>
                                          )
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          );
                        })() : (
                          addingParentInfo?.parentId === primaryBox.id && addingParentInfo.portIndex === portNum ? (
                            <div className="flex items-center gap-1 p-1 rounded bg-slate-900 border border-sky-500/50 text-xs">
                              <select
                                value={selectedRatio}
                                onChange={(e) => setSelectedRatio(Number(e.target.value) as SplitterRatio)}
                                className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-200 border border-slate-800"
                              >
                                <option value={2}>1:2</option>
                                <option value={4}>1:4</option>
                                <option value={8}>1:8</option>
                              </select>
                              <button
                                onClick={handleConfirmAddBox}
                                className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-xs"
                              >
                                Crear
                              </button>
                              <button
                                onClick={() => setAddingParentInfo(null)}
                                className="px-1 text-slate-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRatio(4);
                                setAddingParentInfo({ parentId: primaryBox.id, parentType: 'primario', portIndex: portNum });
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/60 hover:bg-slate-900 text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition"
                              title={`Agregar Caja Secundaria a la salida #${portNum}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Salida #{portNum}: + Secundario</span>
                            </button>
                          )
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
