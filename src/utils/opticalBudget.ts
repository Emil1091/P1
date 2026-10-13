import type { FTTHNode, SplitterRatio } from '../types/ftth';

/**
 * Atenuación estándar de Splitters Balanceados PLC:
 * 1:2  -> 3.5 dB
 * 1:4  -> 7.0 dB
 * 1:8  -> 10.5 dB
 * 1:16 -> 14.0 dB
 * 1:32 -> 17.5 dB
 * 1:64 -> 21.0 dB
 */
export const SPLITTER_LOSS: Record<SplitterRatio, number> = {
  2: 3.5,
  4: 7.0,
  8: 10.5,
  16: 14.0,
  32: 17.5,
  64: 21.0,
};

export const CONNECTOR_LOSS = 0.35; // Pérdida típica por conector SC/APC (dB)
export const SPLICE_LOSS = 0.08;    // Pérdida por fusión (dB)

export interface OpticalStatus {
  status: 'optimal' | 'warning' | 'critical' | 'dead';
  color: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}

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
  } else if (power >= -23.5) {
    return {
      status: 'optimal',
      color: '#22c55e',
      badgeBg: 'bg-emerald-950/80 border-emerald-700/50',
      badgeText: 'text-emerald-400',
      label: 'Excelente'
    };
  } else if (power >= -27.0) {
    return {
      status: 'warning',
      color: '#f97316',
      badgeBg: 'bg-orange-950/80 border-orange-700/50',
      badgeText: 'text-orange-400',
      label: 'Aceptable (-23.5 a -27 dBm)'
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
 * Recorre recursivamente las cajas FTTH calculando la potencia óptica de entrada y de salida
 */
export function calculateFTTHPowers(node: FTTHNode, inputPower: number): FTTHNode {
  const ratio = node.ratio || 4;
  const splitLoss = SPLITTER_LOSS[ratio] || 7.0;
  // Pérdida total en la caja: splitter + conectores/fusiones
  const boxInsertionLoss = splitLoss + (CONNECTOR_LOSS * 2);
  const outputPower = Number((inputPower - boxInsertionLoss).toFixed(2));

  const calculatedChildren = (node.children || []).map(child => {
    return calculateFTTHPowers(child, outputPower);
  });

  return {
    ...node,
    powerInput: Number(inputPower.toFixed(2)),
    powerOutput: outputPower,
    children: calculatedChildren
  };
}
