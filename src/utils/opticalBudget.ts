import type { DiagramNode, SplitterRatio } from '../types/ftth';

/**
 * Atenuación nominal teórica según ratio del Splitter PLC:
 * 1:2 -> 3.5 dB
 * 1:4 -> 7.0 dB
 * 1:8 -> 10.5 dB
 * 1:16 -> 14.0 dB
 * 1:32 -> 17.5 dB
 * 1:64 -> 21.0 dB
 */
export const SPLITTER_LOSS: Record<SplitterRatio, number> = {
  1: 0.2, // acoplador pasante directo
  2: 3.5,
  4: 7.0,
  8: 10.5,
  16: 14.0,
  32: 17.5,
  64: 21.0,
};

export const SPLICE_LOSS = 0.1; // Pérdida media por fusión (dB)
export const CONNECTOR_LOSS = 0.4; // Pérdida media por conector SC/APC (dB)

export interface OpticalStatus {
  status: 'optimal' | 'warning' | 'critical' | 'dead';
  color: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}

/**
 * Evalúa el nivel de señal óptica (dBm) en función de la sensibilidad de una ONT/Cliente
 * Rango operativo estándar: -8.0 dBm a -27.0 dBm
 */
export function evaluatePowerLevel(power: number | undefined): OpticalStatus {
  if (power === undefined || isNaN(power)) {
    return {
      status: 'dead',
      color: '#64748b',
      badgeBg: 'bg-slate-800',
      badgeText: 'text-slate-400',
      label: 'Sin señal'
    };
  }

  if (power > -8.0) {
    return {
      status: 'warning',
      color: '#eab308',
      badgeBg: 'bg-yellow-950/80 border-yellow-700/50',
      badgeText: 'text-yellow-400',
      label: 'Saturado (> -8 dBm)'
    };
  } else if (power >= -24.0) {
    return {
      status: 'optimal',
      color: '#22c55e',
      badgeBg: 'bg-emerald-950/80 border-emerald-700/50',
      badgeText: 'text-emerald-400',
      label: 'Óptima'
    };
  } else if (power >= -27.0) {
    return {
      status: 'warning',
      color: '#f97316',
      badgeBg: 'bg-orange-950/80 border-orange-700/50',
      badgeText: 'text-orange-400',
      label: 'Límite (-24 a -27 dBm)'
    };
  } else {
    return {
      status: 'critical',
      color: '#ef4444',
      badgeBg: 'bg-red-950/80 border-red-700/50',
      badgeText: 'text-red-400',
      label: 'Crítico (< -27 dBm)'
    };
  }
}

/**
 * Motor de cálculo recursivo de potencias ópticas en cascada.
 */
export function calculateOpticalPowers(rootNode: DiagramNode): DiagramNode {
  function traverse(node: DiagramNode, parentPower: number | undefined): DiagramNode {
    let currentPower = parentPower;

    if (node.type === 'olt' || node.type === 'pon') {
      currentPower = node.power !== undefined ? node.power : 4.5;
    } else if (parentPower !== undefined) {
      let loss = 0;

      if (node.type === 'splitter' && node.ratio) {
        loss += (SPLITTER_LOSS[node.ratio] || 3.5) + CONNECTOR_LOSS;
      } else if (node.type === 'nap') {
        if (node.ratio) {
          loss += (SPLITTER_LOSS[node.ratio] || 10.5) + (CONNECTOR_LOSS * 2);
        } else {
          loss += 0.3;
        }
      } else if (node.type === 'mufa') {
        const spliceCount = node.splices?.length || 1;
        loss += (spliceCount * SPLICE_LOSS);
      } else if (node.type === 'client') {
        loss += CONNECTOR_LOSS;
      } else {
        loss += 0.2;
      }

      currentPower = Number((parentPower - loss).toFixed(2));
    }

    const calculatedChildren = (node.children || []).map((child) => traverse(child, currentPower));

    return {
      ...node,
      power: currentPower,
      children: calculatedChildren,
    };
  }

  return traverse(rootNode, rootNode.power !== undefined ? rootNode.power : 4.5);
}
