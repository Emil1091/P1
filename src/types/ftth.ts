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

// ─── Módulo de Simulación de Atenuación ───────────────────────────────────────

/** Estado de señal de una ONU/cliente individual */
export interface SimulatedClient {
  id: string;
  name: string;       // ej. "ONU-01"
  signal: number;     // dBm, ej. -24.5
  isOnline: boolean;  // false = sin señal (offline)
}

/**
 * Estado de salud de la caja basado en los clientes simulados:
 * - normal   → verde (señal aceptable)
 * - warning  → amarillo (≥70% de clientes superan -27 dBm)
 * - critical → naranja (≥70% de clientes superan -29 dBm)
 * - offline  → rojo (todos los clientes están offline)
 */
export type BoxSignalStatus = 'normal' | 'warning' | 'critical' | 'offline';

/** Mapa de datos simulados indexado por nodeId */
export type SimulationData = Record<string, SimulatedClient[]>;

// ─── Tipos / fallas simulables ───────────────────────────────────────────────

/**
 * Escenarios de falla que el usuario puede elegir al simular.
 * - aleatorio           → distribución normal actual (sin falla programada)
 * - off_parcial         → varias cajas NAP sin señal
 * - atenuacion_parcial  → varias cajas NAP con señal degradada
 * - secundario_off      → un splitter secundario completo sin señal
 * - pon_offline         → toda la red del PON sin señal
 * - todo_atenuado       → todas las cajas degradadas
 * - todo_off            → todas las cajas sin señal
 */
export type SimulationScenario =
  | 'aleatorio'
  | 'off_parcial'
  | 'atenuacion_parcial'
  | 'secundario_off'
  | 'pon_offline'
  | 'todo_atenuado'
  | 'todo_off';

/** Cantidad de cajas afectadas en los escenarios parciales */
export type SimulationScope = 'una' | 'mitad' | 'mayoria';

/**
 * Evento de falla aplicable manualmente (con el mouse) sobre una caja del
 * cuadro sinóptico: todas las NAPs bajo la caja clickeada quedan off,
 * atenuadas, o se restauran.
 */
export type FaultEvent = 'off' | 'atenuacion' | 'normal';
