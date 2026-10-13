export type NodeType = 'olt' | 'pon' | 'caja_primaria' | 'caja_secundaria' | 'caja_nap';
export type SplitterRatio = 2 | 4 | 8 | 16 | 32 | 64;

export interface FTTHNode {
  id: string;
  name: string;
  type: NodeType;
  ratio?: SplitterRatio;
  parentPortIndex?: number; // Salida 1, 2, 3, 4... del padre
  location?: string;        // Poste, Cámara o Calle (ej: "Poste 14 - Mitre y Belgrano")
  notes?: string;           // Notas técnicas
  isCollapsed?: boolean;    // Para minimizar/guardar la llave
  children: FTTHNode[];
}

export interface PONPort {
  id: string;
  name: string; // ej. "PON 01"
  slotIndex?: number; // Bandeja/Slot (si es modular)
  portIndex: number;  // Puerto PON en la bandeja
  slotPort: string;   // ej. "1/1" o "0/1/1"
  primaryBox?: FTTHNode; // Caja con splitter primario
}

export type OLTChassisType = 'pizzabox' | 'modular';

export interface OLTDevice {
  id: string;
  name: string;          // ej. "OLT Central"
  brand: string;         // ej. Huawei, ZTE, Fiberhome, VSOL
  model: string;         // ej. MA5800-X7, C320, V1600G
  chassisType: OLTChassisType;
  slotsCount: number;    // Cantidad de bandejas/slots
  portsPerSlot: number;  // Cantidad de puertos PON por bandeja
  ponPorts: PONPort[];
}

export interface BreadcrumbStep {
  id: string;
  name: string;
  type: string;
  portUsed?: number;
  location?: string;
}
