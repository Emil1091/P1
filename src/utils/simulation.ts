import type { FTTHNode, SimulatedClient, BoxSignalStatus, SimulationData } from '../types/ftth';

// ─── Umbrales de señal (dBm) ──────────────────────────────────────────────────
export const SIGNAL_THRESHOLDS = {
  WARNING: -27,   // amarillo: ≥70% de clientes con señal ≤ -27 dBm
  CRITICAL: -29,  // naranja:  ≥70% de clientes con señal ≤ -29 dBm
  OFFLINE_RATIO: 0.70, // porcentaje mínimo para activar el estado
} as const;

// ─── Generación de señales simuladas ─────────────────────────────────────────

/**
 * Genera señales aleatorias para los clientes de una NAP.
 * Distribución realista: la mayoría entre -18 y -26, algunos malos.
 */
function randomSignal(): number {
  const r = Math.random();
  if (r < 0.05) return NaN;                  // 5% offline total
  if (r < 0.15) return randomRange(-29, -32); // 10% muy mala señal
  if (r < 0.30) return randomRange(-27, -29); // 15% señal degradada
  return randomRange(-18, -27);               // 70% señal normal
}

function randomRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/**
 * Genera clientes simulados para una caja NAP.
 * La cantidad de clientes por NAP es entre 4 y el ratio del splitter.
 */
export function generateClientsForNap(node: FTTHNode): SimulatedClient[] {
  const capacity = node.ratio ?? 8;
  // Ocupación parcial: entre 50% y 100% del splitter
  const clientCount = Math.floor(capacity * (0.5 + Math.random() * 0.5));

  return Array.from({ length: clientCount }, (_, i) => {
    const signal = randomSignal();
    const isOnline = !isNaN(signal);
    return {
      id: `${node.id}-onu-${i + 1}`,
      name: `ONU-${String(i + 1).padStart(2, '0')}`,
      signal: isOnline ? signal : 0,
      isOnline,
    };
  });
}

/**
 * Recorre recursivamente el árbol FTTH y genera datos de simulación
 * sólo para cajas NAP (las que tienen clientes finales).
 */
export function generateSimulationData(node: FTTHNode | undefined): SimulationData {
  if (!node) return {};
  const data: SimulationData = {};

  const traverse = (n: FTTHNode) => {
    if (n.type === 'caja_nap') {
      data[n.id] = generateClientsForNap(n);
    }
    for (const child of n.children ?? []) {
      traverse(child);
    }
  };

  traverse(node);
  return data;
}

// ─── Cálculo del estado de señal ─────────────────────────────────────────────

/**
 * Dado un array de clientes simulados, calcula el estado visual de la caja.
 */
export function calculateBoxStatus(clients: SimulatedClient[]): BoxSignalStatus {
  if (!clients || clients.length === 0) return 'normal';

  const allOffline = clients.every(c => !c.isOnline);
  if (allOffline) return 'offline';

  const onlineClients = clients.filter(c => c.isOnline);
  const total = onlineClients.length;

  const belowCritical = onlineClients.filter(c => c.signal <= SIGNAL_THRESHOLDS.CRITICAL).length;
  const belowWarning  = onlineClients.filter(c => c.signal <= SIGNAL_THRESHOLDS.WARNING).length;

  if (belowCritical / total >= SIGNAL_THRESHOLDS.OFFLINE_RATIO) return 'critical';
  if (belowWarning  / total >= SIGNAL_THRESHOLDS.OFFLINE_RATIO) return 'warning';
  return 'normal';
}

/**
 * Calcula el estado de una caja "padre" (primaria/secundaria) basándose
 * en el estado de TODAS sus salidas ocupadas (cajas hijas directas):
 * - Solo se marca como atenuada si TODAS las salidas existentes están
 *   degradadas (estado ≠ normal).
 * - Con menos de 2 ramas instaladas nunca se marca: si una única rama
 *   está degradada, no debe afectar al nivel anterior (evita falsas alarmas).
 * - El estado final es el peor entre las salidas: offline > critical > warning.
 */
export function calculateParentStatus(
  node: FTTHNode,
  simData: SimulationData
): BoxSignalStatus {
  const branches = node.children ?? [];

  // Una sola rama (o ninguna) no alcanza para marcar al nivel padre
  if (branches.length < 2) return 'normal';

  const statuses = branches.map((branch) =>
    branch.type === 'caja_nap'
      ? calculateBoxStatus(simData[branch.id] ?? [])
      : calculateParentStatus(branch, simData)
  );

  // Todas las salidas ocupadas deben estar atenuadas
  if (!statuses.every((s) => s !== 'normal')) return 'normal';

  if (statuses.includes('offline')) return 'offline';
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning'))  return 'warning';

  return 'normal';
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<BoxSignalStatus, {
  border: string;
  bg: string;
  badge: string;
  label: string;
  dot: string;
}> = {
  normal:   { border: 'border-indigo-500/40', bg: '',                   badge: 'bg-emerald-500/20 text-emerald-300', label: 'OK',       dot: 'bg-emerald-400' },
  warning:  { border: 'border-yellow-400/70', bg: 'bg-yellow-950/20',   badge: 'bg-yellow-500/20  text-yellow-300',  label: 'Degradada', dot: 'bg-yellow-400'  },
  critical: { border: 'border-orange-400/70', bg: 'bg-orange-950/20',   badge: 'bg-orange-500/20  text-orange-300',  label: 'Crítica',   dot: 'bg-orange-400'  },
  offline:  { border: 'border-red-400/70',    bg: 'bg-red-950/20',      badge: 'bg-red-500/20     text-red-300',     label: 'Sin señal', dot: 'bg-red-400'     },
};

/** Devuelve la señal promedio de los clientes online, o null si no hay */
export function averageSignal(clients: SimulatedClient[]): number | null {
  const online = clients.filter(c => c.isOnline);
  if (online.length === 0) return null;
  return Math.round(online.reduce((sum, c) => sum + c.signal, 0) / online.length * 10) / 10;
}
