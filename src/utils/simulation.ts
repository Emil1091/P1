import type { FTTHNode, SimulatedClient, BoxSignalStatus, SimulationData, SimulationScenario, SimulationScope, FaultEvent } from '../types/ftth';

// ─── Umbrales de señal (dBm) ──────────────────────────────────────────────────
export const SIGNAL_THRESHOLDS = {
  WARNING: -27,   // amarillo: ≥70% de clientes con señal ≤ -27 dBm
  CRITICAL: -29,  // naranja: ≥70% de clientes con señal ≤ -29 dBm
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
 *
 * Según el escenario elegido (SimulationOptions), algunas o todas las NAPs
 * pueden quedar sin señal (offline) o degradadas (señal muy atenuada).
 */
export function generateSimulationData(
  node: FTTHNode | undefined,
  options: SimulationOptions = { scenario: 'aleatorio' }
): SimulationData {
  if (!node) return {};
  const data: SimulationData = {};

  const naps = collectNaps(node);
  const { scenario, scope = 'mitad', targetSecondaryId } = options;

  const setRandom   = (n: FTTHNode) => { data[n.id] = generateClientsForNap(n); };
  const setOffline  = (n: FTTHNode) => { data[n.id] = offlineClientsForNap(n); };
  const setDegraded = (n: FTTHNode) => { data[n.id] = degradedClientsForNap(n); };

  switch (scenario) {
    case 'pon_offline':
    case 'todo_off':
      naps.forEach(setOffline);
      break;

    case 'todo_atenuado':
      naps.forEach(setDegraded);
      break;

    case 'off_parcial': {
      const affected = new Set(pickRandom(naps, affectedCount(naps.length, scope)));
      naps.forEach(n => (affected.has(n) ? setOffline(n) : setRandom(n)));
      break;
    }

    case 'atenuacion_parcial': {
      const affected = new Set(pickRandom(naps, affectedCount(naps.length, scope)));
      naps.forEach(n => (affected.has(n) ? setDegraded(n) : setRandom(n)));
      break;
    }

    case 'secundario_off': {
      const secNode = targetSecondaryId ? findNodeById(node, targetSecondaryId) : null;
      const secNaps = secNode ? collectNaps(secNode) : [];
      if (secNaps.length === 0) {
        // Sin secundarios instalados o objetivo inválido → comportamiento normal
        naps.forEach(setRandom);
      } else {
        const targetIds = new Set(secNaps.map(n => n.id));
        naps.forEach(n => (targetIds.has(n.id) ? setOffline(n) : setRandom(n)));
      }
      break;
    }

    default:
      naps.forEach(setRandom);
  }

  return data;
}

// ─── Opciones de falla simulada ──────────────────────────────────────────────

export interface SimulationOptions {
  /** Escenario de falla a aplicar. Por defecto: aleatorio. */
  scenario: SimulationScenario;
  /** Proporción de cajas afectadas en escenarios parciales. */
  scope?: SimulationScope;
  /** Id del splitter secundario a dejar sin señal (escenario 'secundario_off'). */
  targetSecondaryId?: string;
}

export const SIMULATION_SCENARIOS: Record<SimulationScenario, { label: string; description: string }> = {
  aleatorio:          { label: 'Aleatorio',                 description: 'Distribución de señales normal, sin falla programada' },
  off_parcial:        { label: 'Varias cajas off',          description: 'Algunas NAPs sin señal (caídas)' },
  atenuacion_parcial: { label: 'Varias cajas atenuadas',    description: 'Algunas NAPs con señal muy degradada' },
  secundario_off:     { label: 'Secundario off',            description: 'Falla en la fibra: todo un splitter secundario queda sin señal' },
  pon_offline:        { label: 'PON completo off',          description: 'Falla en la OLT/fibra: toda la red del PON sin señal' },
  todo_atenuado:      { label: 'Todo atenuado',             description: 'Todas las cajas con señal degradada' },
  todo_off:           { label: 'Todo off',                  description: 'Todas las cajas sin señal' },
};

export const SIMULATION_SCOPE_LABELS: Record<SimulationScope, string> = {
  una:     'Una sola caja',
  mitad:   'La mitad (50%)',
  mayoria: 'La mayoría (75%)',
};

// ─── Helpers de fallas ───────────────────────────────────────────────────────

/** Clientes 100% offline para una NAP (caja caída) */
function offlineClientsForNap(node: FTTHNode): SimulatedClient[] {
  const capacity = node.ratio ?? 8;
  const clientCount = Math.floor(capacity * (0.5 + Math.random() * 0.5));
  return Array.from({ length: clientCount }, (_, i) => ({
    id: `${node.id}-onu-${i + 1}`,
    name: `ONU-${String(i + 1).padStart(2, '0')}`,
    signal: 0,
    isOnline: false,
  }));
}

/** Clientes con señal muy degradada para una NAP (todos online pero mal) */
function degradedClientsForNap(node: FTTHNode): SimulatedClient[] {
  const capacity = node.ratio ?? 8;
  const clientCount = Math.floor(capacity * (0.5 + Math.random() * 0.5));
  return Array.from({ length: clientCount }, (_, i) => ({
    id: `${node.id}-onu-${i + 1}`,
    name: `ONU-${String(i + 1).padStart(2, '0')}`,
    signal: randomRange(-27, -33),
    isOnline: true,
  }));
}

/** Recoge todas las NAPs (hojas) presentes en el árbol bajo un nodo */
function collectNaps(node: FTTHNode, out: FTTHNode[] = []): FTTHNode[] {
  if (node.type === 'caja_nap') out.push(node);
  for (const child of node.children ?? []) collectNaps(child, out);
  return out;
}

/** Busca un nodo por id dentro del árbol */
export function findNodeById(node: FTTHNode | undefined, id: string): FTTHNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Aplica manualmente (clic con el mouse) una falla a todas las NAPs bajo
 * la caja clickeada:
 * - 'off'        → esas NAPs quedan sin señal (offline)
 * - 'atenuacion' → esas NAPs quedan degradadas
 * - 'normal'     → se restauran a distribución aleatoria
 * Devuelve un nuevo SimulationData (no muta el original).
 */
export function applyFaultToNode(
  root: FTTHNode,
  event: FaultEvent,
  currentData: SimulationData
): SimulationData {
  const naps = collectNaps(root);
  const next: SimulationData = { ...currentData };

  for (const nap of naps) {
    if (event === 'off') next[nap.id] = offlineClientsForNap(nap);
    else if (event === 'atenuacion') next[nap.id] = degradedClientsForNap(nap);
    else next[nap.id] = generateClientsForNap(nap);
  }
  return next;
}

/** Devuelve la lista de cajas secundarias instaladas bajo el PON (para elegir objetivo) */
export function getSecondaryBoxes(node: FTTHNode | undefined): { id: string; name: string }[] {
  if (!node) return [];
  const out: { id: string; name: string }[] = [];
  const walk = (n: FTTHNode) => {
    if (n.type === 'caja_secundaria') out.push({ id: n.id, name: n.name });
    for (const child of n.children ?? []) walk(child);
  };
  walk(node);
  return out;
}

/** Selecciona elementos al azar sin repetir */
function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/** Cantidad de NAPs a afectar según el alcance elegido (mínimo 1, nunca más que el total) */
function affectedCount(napCount: number, scope: SimulationScope): number {
  if (napCount <= 1) return 1;
  if (scope === 'una') return 1;
  const pct = scope === 'mitad' ? 0.5 : 0.75;
  return Math.max(1, Math.min(napCount, Math.round(napCount * pct)));
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
  normal:   { border: 'border-indigo-500/40', bg: '',                 badge: 'bg-emerald-500/20 text-emerald-300', label: 'OK',        dot: 'bg-emerald-400' },
  warning:  { border: 'border-amber-500',     bg: 'bg-amber-500/45', badge: 'bg-amber-500/30   text-amber-100',   label: 'Degradada', dot: 'bg-amber-500'  },
  critical: { border: 'border-amber-500',     bg: 'bg-amber-500/45', badge: 'bg-amber-500/30   text-amber-100',   label: 'Degradada', dot: 'bg-amber-500'  },
  offline:  { border: 'border-red-600',       bg: 'bg-red-600/55',   badge: 'bg-red-600/40     text-red-200',     label: 'Sin señal', dot: 'bg-red-500'    },
};

/** Devuelve la señal promedio de los clientes online, o null si no hay */
export function averageSignal(clients: SimulatedClient[]): number | null {
  const online = clients.filter(c => c.isOnline);
  if (online.length === 0) return null;
  return Math.round(online.reduce((sum, c) => sum + c.signal, 0) / online.length * 10) / 10;
}
