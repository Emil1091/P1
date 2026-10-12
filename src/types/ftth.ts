export type NodeType = 'olt' | 'pon' | 'splitter' | 'nap' | 'client' | 'port' | 'mufa';
export type SplitterRatio = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export interface SpliceConnection {
  from: number | string; // e.g. fiber number or splitter output "S1:out:2"
  to: string; // destination node ID or "out"
  toFiber: number; // destination fiber index
}

export interface DiagramNode {
  id: string;
  name: string;
  type: NodeType;
  ratio?: SplitterRatio;
  isCollapsed?: boolean;
  power?: number; // dBm calculado o base
  position?: { x: number; y: number };
  fibers?: number; // Capacidad de hilos del equipo (ej. 12, 24, 48)
  cableFibers?: number; // Hilos del cable entrante/saliente
  splices?: SpliceConnection[]; // Mapeo de fusiones
  children: DiagramNode[];
}

export interface InternalSplitter {
  id: string;
  name: string;
  ratio: SplitterRatio;
  inputFiber?: number; // Hilo de entrada conectado
}

export interface NetworkProject {
  id: string;
  name: string;
  updatedAt: string;
  root: DiagramNode;
}

// Código estándar de colores TIA-598 (12 colores)
export interface FiberColorSpec {
  index: number;
  name: string;
  hex: string;
  textColor: string;
}

export const TIA598_COLORS: FiberColorSpec[] = [
  { index: 1, name: 'Azul', hex: '#2563eb', textColor: '#ffffff' },
  { index: 2, name: 'Naranja', hex: '#ea580c', textColor: '#ffffff' },
  { index: 3, name: 'Verde', hex: '#16a34a', textColor: '#ffffff' },
  { index: 4, name: 'Marrón', hex: '#78350f', textColor: '#ffffff' },
  { index: 5, name: 'Gris', hex: '#64748b', textColor: '#ffffff' },
  { index: 6, name: 'Blanco', hex: '#f8fafc', textColor: '#0f172a' },
  { index: 7, name: 'Rojo', hex: '#dc2626', textColor: '#ffffff' },
  { index: 8, name: 'Negro', hex: '#0f172a', textColor: '#e2e8f0' },
  { index: 9, name: 'Amarillo', hex: '#eab308', textColor: '#0f172a' },
  { index: 10, name: 'Violeta', hex: '#9333ea', textColor: '#ffffff' },
  { index: 11, name: 'Rosa', hex: '#f43f5e', textColor: '#ffffff' },
  { index: 12, name: 'Aqua', hex: '#06b6d4', textColor: '#0f172a' },
];

export function getFiberColor(fiberIndex: number): FiberColorSpec {
  const normIndex = ((fiberIndex - 1) % 12);
  return TIA598_COLORS[normIndex];
}
