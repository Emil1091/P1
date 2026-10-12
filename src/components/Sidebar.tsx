import React from 'react';
import {
  Split,
  Box,
  Radio,
  Sliders,
  FolderTree
} from 'lucide-react';
import type { DiagramNode, NodeType, SplitterRatio } from '../types/ftth';
import { evaluatePowerLevel } from '../utils/opticalBudget';

interface SidebarProps {
  root: DiagramNode | null;
  selectedNode: DiagramNode | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectNode: (node: DiagramNode) => void;
  onUpdateNode: (updated: Partial<DiagramNode>) => void;
  onAddQuickNode: (type: NodeType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  root,
  selectedNode,
  searchQuery,
  onSearchChange,
  onSelectNode,
  onUpdateNode,
  onAddQuickNode,
}) => {
  const renderTreeItem = (node: DiagramNode) => {
    const isSelected = selectedNode?.id === node.id;
    const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.type.toLowerCase().includes(searchQuery.toLowerCase());

    if (searchQuery && !matches) {
      const hasMatchingChild = (n: DiagramNode): boolean =>
        (n.children || []).some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || hasMatchingChild(c));
      if (!hasMatchingChild(node)) return null;
    }

    return (
      <div key={node.id} className="pl-3 border-l border-slate-800/80 my-1">
        <div
          onClick={() => onSelectNode(node)}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer transition ${
            isSelected
              ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
              {node.type}
            </span>
            <span className="truncate">{node.name}</span>
          </div>

          {node.power !== undefined && (
            <span className="font-mono text-[10px] text-slate-500">
              {node.power.toFixed(1)} dB
            </span>
          )}
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-0.5">
            {node.children.map(child => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  const powerEval = evaluatePowerLevel(selectedNode?.power);

  return (
    <aside className="w-80 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-20 shadow-2xl">
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <FolderTree className="w-4 h-4 text-indigo-400" />
          <span>Topología de Red</span>
        </div>
        <input
          type="text"
          placeholder="Buscar nodo por nombre o tipo..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
        />
      </div>

      <div className="p-4 border-b border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
          Biblioteca de Equipos
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onAddQuickNode('splitter')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 text-slate-300 transition group"
          >
            <Split className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition" />
            <span className="text-[10px]">Splitter</span>
          </button>
          <button
            onClick={() => onAddQuickNode('mufa')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 text-slate-300 transition group"
          >
            <Box className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition" />
            <span className="text-[10px]">Mufa</span>
          </button>
          <button
            onClick={() => onAddQuickNode('nap')}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-300 transition group"
          >
            <Radio className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition" />
            <span className="text-[10px]">Caja NAP</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Árbol de Nodos
        </span>
        {root ? (
          renderTreeItem(root)
        ) : (
          <p className="text-xs text-slate-500 italic p-3 text-center">
            No hay nodos en el diagrama.
          </p>
        )}
      </div>

      <div className="border-t border-slate-800/80 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Inspector de Nodo
          </span>
          {selectedNode && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {selectedNode.type}
            </span>
          )}
        </div>

        {selectedNode ? (
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Nombre del Nodo</label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => onUpdateNode({ name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {selectedNode.type === 'splitter' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Ratio de División PLC</label>
                <select
                  value={selectedNode.ratio || 8}
                  onChange={(e) => onUpdateNode({ ratio: Number(e.target.value) as SplitterRatio })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={2}>1:2 (-3.5 dB)</option>
                  <option value={4}>1:4 (-7.0 dB)</option>
                  <option value={8}>1:8 (-10.5 dB)</option>
                  <option value={16}>1:16 (-14.0 dB)</option>
                  <option value={32}>1:32 (-17.5 dB)</option>
                  <option value={64}>1:64 (-21.0 dB)</option>
                </select>
              </div>
            )}

            {selectedNode.type === 'olt' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Potencia TX SFP (dBm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedNode.power ?? 4.5}
                  onChange={(e) => onUpdateNode({ power: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}

            {(selectedNode.type === 'mufa' || selectedNode.type === 'nap') && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Capacidad de Cable (Fibras)</label>
                <select
                  value={selectedNode.cableFibers || 12}
                  onChange={(e) => onUpdateNode({ cableFibers: Number(e.target.value), fibers: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={6}>6 Fibras (Tubos x6)</option>
                  <option value={12}>12 Fibras (TIA-598)</option>
                  <option value={24}>24 Fibras (2 Tubos)</option>
                  <option value={48}>48 Fibras (4 Tubos)</option>
                  <option value={96}>96 Fibras Troncal</option>
                </select>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Potencia Calculada</span>
                <span className="font-mono font-bold text-sm text-slate-100">
                  {selectedNode.power !== undefined ? `${selectedNode.power > 0 ? '+' : ''}${selectedNode.power.toFixed(2)} dBm` : 'N/A'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${powerEval.badgeBg} ${powerEval.badgeText}`}>
                {powerEval.label}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">
            Selecciona cualquier nodo del diagrama para inspeccionar o editar sus propiedades técnicas.
          </p>
        )}
      </div>
    </aside>
  );
};
