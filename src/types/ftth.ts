export type NodeType = 'olt' | 'pon' | 'caja_primaria' | 'caja_secundaria' | 'caja_nap' | 'client';
export type SplitterRatio = 2 | 4 | 8 | 16 | 32 | 64;

export interface SplitterOutputPort {
  portNumber: number;
  label?: string;
  connectedNodeId?: string; // ID de la caja hija conectada
}

export interface FTTHNode {
  id: string;
  name: string;
  type: NodeType;
  ratio?: SplitterRatio; // e.g. 4 para 1x4, 8 para 1x8
  powerInput?: number;   // dBm a la entrada de la caja
  powerOutput?: number;  // dBm a la salida de cada puerto del splitter
  location?: string;     // Poste, Cámara o Calle
  children: FTTHNode[];  // Cajas hijas conectadas a las salidas
  parentPortIndex?: number; // Cuál salida del padre ocupa (1, 2, 3...)
  isCollapsed?: boolean;
}

export interface PONPort {
  id: string;
  name: string; // ej. "PON 01", "PON 02"
  slotPort: string; // ej. "0/1/1"
  txPower: number; // dBm inicial (+4.5 a +5.0)
  primaryBox?: FTTHNode; // Caja primaria conectada al PON
}

export interface OLTDevice {
  id: string;
  name: string; // ej. "OLT Central - ZTE C320"
  location: string; // ej. "Cabecera Central"
  portsCount: number; // ej. 8 o 16 puertos
  ponPorts: PONPort[];
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
