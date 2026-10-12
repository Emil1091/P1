import React from 'react';
import {
  Server,
  Zap,
  Split,
  Box,
  Home,
  ChevronDown,
  ChevronRight,
  Sliders,
  Trash2,
  PlusCircle,
  Radio
} from 'lucide-react';
import type { DiagramNode, NodeType } from '../types/ftth';
import { evaluatePowerLevel } from '../utils/opticalBudget';

interface CanvasNodeProps {
  node: DiagramNode;
  isSelected: boolean;
  onSelect: (node: DiagramNode) => void;
  onToggleCollapse: (id: string) => void;
  onOpenSplices: (node: DiagramNode) => void;
  onAddChild: (parentNode: DiagramNode, type: NodeType) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onToggleCollapse,
  onOpenSplices,
  onAddChild,
  onDelete,
  onDragStart,
}) => {
  const powerStatus = evaluatePowerLevel(node.power);

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'olt':
        return <Server className="w-5 h-5 text-indigo-400" />;
      case 'pon':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'splitter':
        return <Split className="w-5 h-5 text-sky-400" />;
      case 'mufa':
        return <Box className="w-5 h-5 text-purple-400" />;
      case 'nap':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'client':
        return <Home className="w-5 h-5 text-pink-400" />;
      default:
        return <Box className="w-5 h-5 text-slate-400" />;
    }
  };

  const getNodeTypeBadge = (type: NodeType) => {
    switch (type) {
      case 'olt': return 'OLT Master';
      case 'pon': return 'Puerto PON';
      case 'splitter': return `Splitter 1:${node.ratio || 8}`;
      case 'mufa': return `Mufa (${node.cableFibers || 12}FO)`;
      case 'nap': return `NAP 1:${node.ratio || 8}`;
      case 'client': return 'Cliente ONT';
      default: return type.toUpperCase();
    }
  };

  const x = node.position?.x ?? 100;
  const y = node.position?.y ?? 100;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      className={`group w-64 rounded-xl border transition-all duration-150 select-none ${
        isSelected
          ? 'border-indigo-500 bg-slate-900/95 ring-2 ring-indigo-500/30 shadow-2xl shadow-indigo-500/20'
          : 'border-slate-800 bg-slate-900/85 hover:border-slate-700 shadow-xl'
      } backdrop-blur-md`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      <div
        onMouseDown={(e) => onDragStart(e, node.id)}
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 cursor-grab active:cursor-grabbing bg-slate-950/40 rounded-t-xl"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded bg-slate-800/60 border border-slate-700/50">
            {getNodeIcon(node.type)}
          </div>
          <span className="text-xs font-semibold text-slate-200 truncate">
            {node.name}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {node.children && node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node.id);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={node.isCollapsed ? 'Expandir' : 'Colapsar'}
            >
              {node.isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="px-2 py-0.5 rounded-full font-mono bg-slate-800/80 text-slate-400 border border-slate-700/40">
            {getNodeTypeBadge(node.type)}
          </span>

          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono font-bold text-[11px] ${powerStatus.badgeBg} ${powerStatus.badgeText}`}
            title={`Estado óptico: ${powerStatus.label}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: powerStatus.color }}
            />
            {node.power !== undefined ? `${node.power > 0 ? '+' : ''}${node.power.toFixed(2)} dBm` : '-- dBm'}
          </div>
        </div>

        {node.type === 'mufa' && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60">
            <span>Fusiones: {node.splices?.length || 0}</span>
            <span>Hilos: {node.cableFibers || 12}FO</span>
          </div>
        )}

        {node.type === 'splitter' && (
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Salidas activas: {node.children?.length || 0} / {node.ratio || 8}</span>
            <span className="font-mono text-indigo-400">1:{node.ratio || 8}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1">
            {node.type === 'mufa' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSplices(node);
                }}
                className="px-2 py-1 text-[11px] font-medium rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 flex items-center gap-1"
                title="Abrir bandeja de empalmes"
              >
                <Sliders className="w-3 h-3" /> Bandeja
              </button>
            )}

            <div className="relative group/add">
              <button
                className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800"
                title="Añadir elemento derivado"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              
              <div className="hidden group-hover/add:flex absolute bottom-full left-0 mb-1 bg-slate-950 border border-slate-800 rounded-lg p-1 shadow-xl flex-col gap-0.5 z-20 min-w-[110px]">
                {node.type !== 'client' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddChild(node, 'splitter'); }}
                      className="text-left px-2 py-1 text-[10px] text-slate-300 hover:bg-indigo-600 hover:text-white rounded"
                    >
                      + Splitter
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddChild(node, 'mufa'); }}
                      className="text-left px-2 py-1 text-[10px] text-slate-300 hover:bg-indigo-600 hover:text-white rounded"
                    >
                      + Mufa
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddChild(node, 'nap'); }}
                      className="text-left px-2 py-1 text-[10px] text-slate-300 hover:bg-indigo-600 hover:text-white rounded"
                    >
                      + NAP
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddChild(node, 'client'); }}
                      className="text-left px-2 py-1 text-[10px] text-slate-300 hover:bg-indigo-600 hover:text-white rounded"
                    >
                      + Cliente ONT
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {node.type !== 'olt' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800"
              title="Eliminar nodo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
