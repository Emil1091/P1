import React from 'react';

interface CurlyBracketProps {
  height: number;
  width?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Dibuja una llave tipográfica clásica { orientada horizontalmente:
 * Empieza a la izquierda (x=0, y=mid), se abre hacia la derecha (x=width, y=0 y y=height)
 * para abrazar verticalmente a todos los hijos como en un cuadro sinóptico.
 */
export const CurlyBracket: React.FC<CurlyBracketProps> = ({
  height,
  width = 24,
  color = '#6366f1',
  strokeWidth = 2,
}) => {
  const safeHeight = Math.max(height, 28);
  const midY = safeHeight / 2;
  const radius = Math.min(10, safeHeight / 4);

  // Path SVG de llave matemática clásica de apertura hacia la derecha
  // Empieza en la punta izquierda del vértice central (0, midY)
  // Sube hacia arriba (width, 0) y baja hacia abajo (width, safeHeight)
  const pathData = `
    M 2 ${midY}
    C ${width * 0.45} ${midY}, ${width * 0.55} ${midY - radius}, ${width * 0.7} ${midY - radius * 1.5}
    L ${width * 0.7} ${radius * 1.5}
    C ${width * 0.7} ${radius * 0.5}, ${width * 0.85} 0, ${width} 2
    M 2 ${midY}
    C ${width * 0.45} ${midY}, ${width * 0.55} ${midY + radius}, ${width * 0.7} ${midY + radius * 1.5}
    L ${width * 0.7} ${safeHeight - radius * 1.5}
    C ${width * 0.7} ${safeHeight - radius * 0.5}, ${width * 0.85} ${safeHeight}, ${width} ${safeHeight - 2}
  `;

  return (
    <svg
      width={width}
      height={safeHeight}
      viewBox={`0 0 ${width} ${safeHeight}`}
      className="flex-shrink-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
