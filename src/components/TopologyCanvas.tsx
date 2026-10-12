import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { DiagramNode, NodeType } from '../types/ftth';
import { CanvasNode } from './CanvasNode';

interface TopologyCanvasProps {
  root: DiagramNode;
  selectedNode: DiagramNode | null;
  onSelectNode: (node: DiagramNode) => void;
  onToggleCollapse: (id: string) => void;
  onOpenSplices: (node: DiagramNode) => void;
  onAddChild: (parentNode: DiagramNode, type: NodeType) => void;
  onDeleteNode: (id: string) => void;
  onUpdatePosition: (id: string, pos: { x: number; y: number }) => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  root,
  selectedNode,
  onSelectNode,
  onToggleCollapse,
  onOpenSplices,
  onAddChild,
  onDeleteNode,
  onUpdatePosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 150 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 });

  // Aplanar todos los nodos visibles
  const flattenNodes = (node: DiagramNode): DiagramNode[] => {
    const list: DiagramNode[] = [node];
    if (!node.isCollapsed && node.children) {
      node.children.forEach(child => {
        list.push(...flattenNodes(child));
      });
    }
    return list;
  };

  const visibleNodes = flattenNodes(root);

  // Generar conexiones entre padres e hijos
  interface LinkInfo {
    fromId: string;
    toId: string;
    fromPos: { x: number; y: number };
    toPos: { x: number; y: number };
    type: string;
    fibers?: number;
  }

  const links: LinkInfo[] = [];

  const extractLinks = (parent: DiagramNode) => {
    if (!parent.isCollapsed && parent.children) {
      parent.children.forEach(child => {
        links.push({
          fromId: parent.id,
          toId: child.id,
          fromPos: parent.position || { x: 100, y: 100 },
          toPos: child.position || { x: 300, y: 100 },
          type: child.type,
          fibers: child.cableFibers || 12,
        });
        extractLinks(child);
      });
    }
  };

  extractLinks(root);

  // Manejo de Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingNodeId) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggingNodeId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const newX = (e.clientX - containerRect.left - pan.x) / zoom;
      const newY = (e.clientY - containerRect.top - pan.y) / zoom;

      onUpdatePosition(draggingNodeId, {
        x: Math.round(newX - nodeOffset.x),
        y: Math.round(newY - nodeOffset.y),
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Zoom con rueda
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 2.5));
  };

  const startNodeDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = visibleNodes.find(n => n.id === id);
    if (!node) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const mouseX = (e.clientX - containerRect.left - pan.x) / zoom;
    const mouseY = (e.clientY - containerRect.top - pan.y) / zoom;

    setNodeOffset({
      x: mouseX - (node.position?.x || 100),
      y: mouseY - (node.position?.y || 100),
    });
    setDraggingNodeId(id);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 100, y: 150 });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full overflow-hidden bg-[#090d16] cursor-grab active:cursor-grabbing select-none"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.5" fill="#64748b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none w-full h-full"
      >
        <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none">
          <defs>
            <linearGradient id="fiberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {links.map((link) => {
            const startX = link.fromPos.x + 128;
            const startY = link.fromPos.y;
            const endX = link.toPos.x - 128;
            const endY = link.toPos.y;

            const dx = Math.abs(endX - startX) * 0.55;
            const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <g key={`${link.fromId}->${link.toId}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="6"
                  strokeOpacity="0.15"
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#fiberGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="6 2"
                />
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-34"
                    y="-11"
                    width="68"
                    height="22"
                    rx="6"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {link.fibers} FO
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 pointer-events-auto">
          {visibleNodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              onSelect={onSelectNode}
              onToggleCollapse={onToggleCollapse}
              onOpenSplices={onOpenSplices}
              onAddChild={onAddChild}
              onDelete={onDeleteNode}
              onDragStart={startNodeDrag}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-2xl backdrop-blur-md z-30">
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.15, 2.5))}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono px-1 text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.85, 0.3))}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />
        <button
          onClick={resetView}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Centrar Vista"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
